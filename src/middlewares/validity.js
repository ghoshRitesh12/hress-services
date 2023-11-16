import { config } from "dotenv";
import { compare } from "bcrypt";
import createHttpError from "http-errors";

config();

export async function checkReqValidity(req, res, next) {
  try {
    const parentDomain = req?.headers?.["x-parent-service-domain"];
    if (!parentDomain || parentDomain !== process.env?.PARENT_SERVICE_DOMAIN) {
      throw createHttpError.BadRequest();
    }

    const serviceKey = decodeURIComponent(req?.query?.key);
    if (!serviceKey) {
      throw createHttpError.BadRequest("Service key required");
    }

    if (await compare(process.env?.HRESS_SERVICE_SECRET, serviceKey)) {
      return next();
    }
    throw createHttpError.Forbidden("Unauthorized request 🙄");

  } catch (err) {
    next(err);
  }
}
