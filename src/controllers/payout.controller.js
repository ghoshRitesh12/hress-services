import createHttpError from "http-errors";
import { isReqVerified } from "../helpers/verifyReq.js";
import { invokePayoutGeneration } from "../services/payout.js";

export async function handlePayout(req, res, next) {
  try {
    const parentDomain = req?.headers?.["x-parent-service-domain"];
    if (!parentDomain || parentDomain !== process.env?.PARENT_SERVICE_DOMAIN) {
      throw createHttpError.BadRequest();
    }

    const serviceKey = decodeURIComponent(req?.query?.key);
    if (!serviceKey) {
      throw createHttpError.BadRequest("Service key required");
    }
    if (!(await isReqVerified(serviceKey))) {
      throw createHttpError.Forbidden("Unauthorized request 🙄");
    }

    const dateRegex = /^\d{1,2}-\d{1,2}-\d{4}$/;

    const incomePeriod = req?.body?.incomePeriod;
    if (!incomePeriod || !dateRegex.test(incomePeriod)) {
      throw createHttpError.BadRequest("Invalid Payload");
    }

    invokePayoutGeneration(incomePeriod);
    return res.json({
      msg: "Generating payout. Hang tight!"
    });

  } catch (err) {
    console.error(err);
    next(err);
  }
}
