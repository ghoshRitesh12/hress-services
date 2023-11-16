import "../services/payout.js";
import createHttpError from "http-errors";

export async function handlePayout(req, res, next) {
  try {
    const dateRegex = /^\d{1,2}-\d{1,2}-\d{4}$/;

    const incomePeriod = req?.body?.incomePeriod;
    if (!incomePeriod || !dateRegex.test(incomePeriod)) {
      throw createHttpError.BadRequest("Invalid Payload");
    }

    // invokePayoutGeneration(incomePeriod)
    process.emit("gen:payout", incomePeriod);

    return res.json({
      msg: "Generating payout. Hang tight!"
    });

  } catch (err) {
    console.error(err);
    next(err);
  }
}
