// import "../services/payout-pdf.js";
import "../services/payout-pdf.js";
import createHttpError from "http-errors";

export async function handlePayoutPDFGen(req, res, next) {
  try {
    const dateRegex = /^\d{1,2}-\d{1,2}-\d{4}$/;

    const incomePeriod = req?.body?.incomePeriod;
    if (!incomePeriod || !dateRegex.test(incomePeriod)) {
      throw createHttpError.BadRequest("Invalid Payload");
    }

    // invokePayoutPDFGeneration(incomePeriod)
    process.emit("gen:payout-pdf", incomePeriod);

    return res.json({
      msg: "Generating pdf payout statement. Hang tight!"
    });

  } catch (err) {
    console.error(err);
    next(err);
  }
}
