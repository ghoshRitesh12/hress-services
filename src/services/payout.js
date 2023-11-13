import { config } from "dotenv";
import { startSession } from "mongoose";
import User from "../models/User.model.js";
import sendEmail from "../config/email.js";
import Income from "../models/Income.model.js";
import getBiMonthlyCTO from "../helpers/cto.js";
import Expenditure from "../models/Expenditure.model.js";

config();

/**
  1. findout bi-monthly cto
  2. calculate carFund
  3. aggregate all users who are eligible for income, 
     finding out their totalLevelIncome and carFund
  4. Merge the results into "Income" collection
  5. Make this bi-monthly expenditure statement in "Expenditure" model
*/

export async function invokePayoutGeneration(incomePeriod) {
  const payoutSession = await startSession();
  payoutSession.startTransaction({
    readConcern: "snapshot",
    writeConcern: {
      w: "majority",
      journal: true
    }
  })

  try {
    if (!incomePeriod) throw new Error("Income period missing");

    const BATCH_SIZE = 6;
    const CAR_FUND_INCENTIVE = 3; // 3% of C.T.O
    const CAR_FUND_MIN_ELIGIBILITY_RANK = 7; // 7
    const CAR_FUND_MAX_ELIGIBILITY_RANK = 12; // 12

    const period = incomePeriod?.split("-")?.map(i => Number(i))
    if (period?.length !== 3) throw new Error("Invalid Payload");

    const [biMonthlyCTO, totalEligibleUsers] = await Promise.all([
      getBiMonthlyCTO(
        period[0],
        period[1],
        period[2],
      ),
      User.aggregate([
        {
          $match: {
            rank: {
              $gte: CAR_FUND_MIN_ELIGIBILITY_RANK,
              $lte: CAR_FUND_MAX_ELIGIBILITY_RANK
            },
            active: { $eq: true }
          }
        },
        {
          $project: {
            _id: 1
          }
        },
        {
          $count: "frequency"
        }
      ]).session(payoutSession)
    ])
    const frequency = totalEligibleUsers?.[0]?.frequency || 1;
    const carFund = (((CAR_FUND_INCENTIVE / 100)) * biMonthlyCTO) / frequency;

    const payeeIncomeAggregation = User.aggregate([
      {
        $match: {
          $or: [
            { 'levels.referrals.createdAt': incomePeriod },
            { 'rank': { $gte: CAR_FUND_MIN_ELIGIBILITY_RANK } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          rank: 1,
          'info.name': 1,
          referralId: 1,
          levels: {
            $map: {
              input: "$levels",
              as: "level",
              in: {
                referrals: {
                  $filter: {
                    input: "$$level.referrals",
                    as: "referral",
                    cond: {
                      $and: [
                        { $gt: ["$$referral.commission", 0] },
                        { $eq: ["$$referral.createdAt", incomePeriod] }
                      ]
                    }
                  }
                }
              },

            }
          },
        }
      },
      {
        $unwind: "$levels"
      },
      {
        $unwind: {
          path: "$levels.referrals",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          rank: { $first: "$rank" },
          fullname: { $first: "$info.name" },
          referralId: { $first: "$referralId" },
          levels: {
            $push: "$levels"
          },
        }
      },
      {
        $lookup: {
          from: "Users",
          foreignField: "_id",
          localField: "levels.referrals.userRef",
          as: "allReferrals",
          let: {
            levelReferrals: { // all referrals unwinded as levels
              $filter: {
                input: "$levels",
                as: "item",
                cond: {
                  $gt: [
                    {
                      $size: { $objectToArray: "$$item" }
                    },
                    0
                  ]
                }
              }
            }
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$active", true]
                }
              }
            },
            {
              $addFields: {
                parentReference: {
                  $arrayElemAt: [
                    "$$levelReferrals",
                    {
                      $indexOfArray: [
                        "$$levelReferrals.referrals.userRef", // all referrals unwinded as levels
                        "$_id",
                      ]
                    }
                  ]
                }
              }
            },
            {
              $project: {
                // _id: 1,
                // o: "$$levelReferrals",
                // parentReference: 1,
                // pID: "$parentReference.referrals.userRef",
                referralId: 1,
                courseType: 1,
                commission: "$parentReference.referrals.commission"
              }
            },
          ]

        }
      },
      {
        $addFields: {
          allLevelIncome: {
            $map: {
              input: "$allReferrals",
              as: "referral",
              in: {
                $let: {
                  vars: {
                    joiningFees: {
                      $cond: {
                        if: { $eq: ["$$referral.courseType", "advance"] },
                        then: 20000,
                        else: {
                          $cond: {
                            if: { $eq: ["$$referral.courseType", "basic"] },
                            then: 12000,
                            else: 0
                          }
                        }
                      }
                    },
                    commission: "$$referral.commission",
                    referralIncome: 0,
                  },
                  in: {
                    $cond: [
                      { $gt: ['$$commission', 20] },
                      {
                        $let: {
                          vars: {
                            levelCommission: { $subtract: ['$$commission', 20] },
                            spilloverCommission: 20,
                            totalCommission: {
                              $add: [
                                {
                                  $multiply: [
                                    '$$joiningFees',
                                    0.2
                                  ]
                                },
                                {
                                  $multiply: [
                                    '$$joiningFees',
                                    {
                                      $divide: [
                                        { $subtract: ['$$commission', 20] }, // level commission
                                        100
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          },
                          in: {
                            referralIncome: { $add: ['$$referralIncome', '$$totalCommission'] }
                          }
                        }
                      },
                      {
                        referralIncome: { $add: ['$$referralIncome', { $multiply: ['$$joiningFees', { $divide: ['$$commission', 100] }] }] }
                      }
                    ]
                  }
                }
              }
            }
          },
        }
      },
      {
        $addFields: {
          totalLevelIncome: {
            $sum: "$allLevelIncome.referralIncome"
          },
          carFund: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$rank", CAR_FUND_MIN_ELIGIBILITY_RANK] },
                  { $lte: ["$rank", CAR_FUND_MAX_ELIGIBILITY_RANK] },
                ]
              },
              then: carFund,
              else: 0
            }
          },
        }
      },
      {
        $match: {
          $or: [
            { totalLevelIncome: { $gt: 0 } },
            { carFund: { $gt: 0 } }
          ]
        }
      },
      {
        $addFields: {
          updateOne: {
            filter: {
              referralId: "$referralId"
            },
            update: {
              [`incomes@${incomePeriod}`]: ["$totalLevelIncome", "$carFund"]
            }
          }
        }
      },
      {
        $addFields: {
          "updateOne.update": {
            $map: {
              input: { $objectToArray: "$updateOne.update" },
              as: "updateField",
              in: {
                k: {
                  $replaceAll: {
                    input: "$$updateField.k",
                    find: "@",
                    replacement: "."
                  }
                },
                v: "$$updateField.v"
              }
            }
          }
        }
      },
      {
        $addFields: {
          "updateOne.update": { $arrayToObject: "$updateOne.update" }
        }
      },
      {
        $project: {
          _id: 0,
          updateOne: 1,
          updateOnes: 1, //MAYNOT_NEED
        }
      },
    ]).session(payoutSession).cursor();

    await payeeIncomeAggregation.eachAsync(async function (doc, i) {
      try {
        await Income.bulkWrite(doc, { session: payoutSession })
      } catch (err) {
        throw err
      }
    }, {
      parallel: BATCH_SIZE,
      batchSize: BATCH_SIZE,
      continueOnError: false
    })

    // 
    const expenditureStatementAggregation = Income.aggregate([
      {
        $match: {
          [`incomes.${incomePeriod}`]: { $exists: true }
        }
      },
      {
        $project: {
          _id: 0,
          userRef: "$userProfile",
          income: `$incomes.${incomePeriod}`
        }
      },
    ]).session(payoutSession).cursor();

    // **run for eachAsync batch of individual income statements, 
    // **for each batch do perform updateOne(), use the $push operator
    // **along with the $each operator to push and spread batched array elements
    await expenditureStatementAggregation.eachAsync(async function (doc, i) {
      try {
        await Expenditure.bulkWrite(
          [{
            updateOne: {
              filter: {
                month: incomePeriod
              },
              update: {
                $push: {
                  payees: {
                    $each: doc
                  }
                }
              }
            }
          }],
          { session: payoutSession }
        )
      } catch (err) {
        throw err;
      }
    }, {
      parallel: BATCH_SIZE,
      batchSize: BATCH_SIZE,
      continueOnError: false
    })

    await payoutSession.commitTransaction();
    await payoutSession.endSession();

    // send success email
    // return foundUser;

  } catch (err) {
    console.error(err);
    await payoutSession.abortTransaction();
    await payoutSession.endSession();

    const retryEndpoint = `${process.env?.PARENT_SERVICE_DOMAIN}/account/expenditure`;

    // send failure email
    await sendEmail({
      receiver: [
        process.env.ADMIN_EMAIL_1,
        process.env.ADMIN_EMAIL_2,
        process.env.ADMIN_EMAIL_3
      ],
      emailSubject: `Payout generation failed for the income period ${incomePeriod}`,
      emailHTML: `
        <div 
          style="
          font-family: sans-serif; background-color: #333; 
          max-width: fit-content; padding: 32px; color: #eee; 
          border-radius: 16px; word-wrap: break-word; font-weight: 400;
          "
        >
          This is an email from Hress payout generation service to notify you that
          unfortunately payout generation for the income period of ${incomePeriod} has failed.
          You may try again by going to 
          <a href="${retryEndpoint}">
            ${retryEndpoint}
          </a> 
          and tapping on "Generate Payout".
        </div>
      `
    })
  }
}
