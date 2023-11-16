import fs from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import sendEmail from "../config/email.js";
import { PDFDocument } from "pdfkit-table-ts";
import Income from "../models/Income.model.js";
// import Expenditure from "../models/Expenditure.model.js";

config();

process.on("gen:payout-pdf", (incomePeriod) => {
  invokePayoutPDFGeneration(incomePeriod)
})

/**
  Query payee statements from the db and put them in the pdf
  in the format of a table 
*/
async function invokePayoutPDFGeneration(incomePeriod) {
  const BATCH_SIZE = 6;
  const d = new Date(incomePeriod?.split("-")?.reverse()?.join("-"))
  const EXPENDITURE_PERIOD_NAME = `${d?.getDate() <= 15 ? '1st' : '2nd'} half of ${d?.toLocaleString('default', { month: 'long' })} ${d?.getFullYear()}`;
  const EXPENDITURE_ENDPOINT = `${process.env?.PARENT_SERVICE_DOMAIN}/account/expenditure`;

  const pdfFileName = resolve(
    process.cwd(),
    "src/statements",
    `${EXPENDITURE_PERIOD_NAME.replace(/[\s]+/g, "_")}.pdf`
  )

  try {
    const pdfDoc = new PDFDocument({
      margin: 30,
      size: "A4",
      autoFirstPage: true,
      // compress: true,
    })
    if (!incomePeriod) throw new Error("Income period missing");
    console.log(`payout pdf generation started for: ${EXPENDITURE_PERIOD_NAME}\n`)

    pdfDoc.pipe(fs.createWriteStream(pdfFileName))

    await pdfDoc.table({
      title: {
        label: "Hress Trading Corporation \nPayout Statement",
        fontSize: 16,
        color: "#333",
      },
      subtitle: {
        label: `\nPeriod: ${EXPENDITURE_PERIOD_NAME}\n\n\n`,
        fontSize: 12,
        color: "#666"
      },
      headers: [
        {
          label: "Name",
          fontSize: 12,
          valign: "center",
          columnColor: "#444",
        },
        {
          label: "Email Address",
          fontSize: 12,
          valign: "center",
          columnColor: "#444",
        },
        {
          label: "Bank Account No",
          fontSize: 12,
          valign: "center",
          columnColor: "#444",
        },
        {
          label: "IFSC",
          fontSize: 12,
          valign: "center",
          columnColor: "#444",
        },
        {
          label: "Level Income",
          fontSize: 12,
          valign: "center",
          columnColor: "#444",
        },
        {
          label: "Car Fund",
          fontSize: 12,
          valign: "center",
          columnColor: "#444",
        },
      ],
    })

    const payoutPdfGenAggregation = Income.aggregate([
      {
        $match: {
          [`incomes.${incomePeriod}`]: { $exists: true }
        }
      },
      {
        $lookup: {
          from: "Users",
          foreignField: "_id",
          localField: "userProfile",
          as: "populatedPayees",
          let: { income: `$incomes.${incomePeriod}` },
          pipeline: [
            {
              $project: {
                _id: 0,
                // payees: 0,
                // name: "$info.name",
                // email: "$info.email",
                // bankAccountNo: "$info.bankAccountNo",
                // ifsc: "$info.ifsc",
                // income: "$parentReference.income",

                data: [
                  "$info.name",
                  "$info.email",
                  { $ifNull: ["$info.bankAccountNo", "N/A"] },
                  { $ifNull: ["$info.ifsc", "N/A"] },
                  {
                    $arrayElemAt: [
                      "$$income",
                      0
                    ]
                  },
                  {
                    $arrayElemAt: [
                      "$$income",
                      1
                    ]
                  },
                ],
              }
            }
          ]
        }
      },
      {
        $addFields: {
          populatedRowData: {
            $arrayElemAt: [
              "$populatedPayees",
              0
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          // payees: 0,
          // populatedPayees: 0,
          row: "$populatedRowData.data"
          // row: {
          //   $arrayElemAt: [
          //     "$populatedPayees",
          //     0
          //   ]
          // }
        }
      },
    ]).cursor();

    await payoutPdfGenAggregation.eachAsync(async function (doc, i) {
      try {
        const table = {
          headers: ["", "", "", "", "", ""],
          rows: doc.map(i => i.row),
        }

        await pdfDoc.table(table, {
          hideHeader: true,
          padding: [2, 4],
          divider: {
            header: { disabled: false, width: 0.05, opacity: 0.1 },
            horizontal: { disabled: false, width: 0.5, opacity: 0.5 },
          },
        });
      } catch (error) {
        throw error;
      }
    }, {
      parallel: BATCH_SIZE,
      batchSize: BATCH_SIZE,
      continueOnError: false,
    })

    pdfDoc.end();

    console.log(`payout pdf generated for: ${EXPENDITURE_PERIOD_NAME}\n`)
    // return "bruh";

    // send success email
    await sendEmail({
      receiver: [
        process.env.ADMIN_EMAIL_1,
        process.env.ADMIN_EMAIL_2,
        process.env.ADMIN_EMAIL_3
      ],
      emailSubject: `Payout PDF generated for the period ${EXPENDITURE_PERIOD_NAME}`,
      emailHTML: `
        <div 
          style="
          font-family: sans-serif; background-color: #333; 
          max-width: fit-content; padding: 32px; color: #eee; 
          border-radius: 16px; word-wrap: break-word; font-weight: 400;
          "
        >
          This is an email from Hress payout generation service to notify you that
          payout statement pdf for the period ${EXPENDITURE_PERIOD_NAME} has been generated.
        </div>
      `,
      attachments: [{
        filename: `${EXPENDITURE_PERIOD_NAME.replace(/[\s]+/g, "_")}.pdf`,
        path: pdfFileName
      }]
    })

    console.log("email sent");

    // return t;

  } catch (err) {
    console.log(`payout pdf generation failed for: ${EXPENDITURE_PERIOD_NAME}\n`)
    console.error(err);

    // pdfDoc.end();

    // return "error";
    // send failure email
    await sendEmail({
      receiver: [
        process.env.ADMIN_EMAIL_1,
        process.env.ADMIN_EMAIL_2,
        process.env.ADMIN_EMAIL_3
      ],
      emailSubject: `Payout PDF generation failed for the period ${EXPENDITURE_PERIOD_NAME}`,
      emailHTML: `
        <div 
          style="
          font-family: sans-serif; background-color: #333; 
          max-width: fit-content; padding: 32px; color: #eee; 
          border-radius: 16px; word-wrap: break-word; font-weight: 400;
          "
        >
          This is an email from Hress payout generation service to notify you that
          unfortunately payout pdf generation for the period ${EXPENDITURE_PERIOD_NAME} has failed.
          You may try again by going to 
          <a href="${EXPENDITURE_ENDPOINT}">
            ${EXPENDITURE_ENDPOINT}
          </a> 
          and tapping on "Generate Payout PDF".
        </div>
      `
    })
  }
}
