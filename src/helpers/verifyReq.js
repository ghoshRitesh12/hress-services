import { compare } from "bcrypt";

export async function isReqVerified(key) {
  try {
    if (!key) throw new Error("No key found");

    const isValidKey = await compare(process.env.HRESS_SERVICE_SECRET, key);
    return isValidKey;

  } catch (err) {
    console.log(err);
    Promise.reject(err);
  }
}
