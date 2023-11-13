import { createTransport } from "nodemailer";

const transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.SENDER_EMAIL_ID,
    pass: process.env.SENDER_EMAIL_PWD
  }
})

/**
  @type {
    receiver: string;
    emailSubject: string;
    emailText?: string;
    emailHTML?: string;
  }
*/
export default async function sendEmail(options) {
  try {
    if (!options?.receiver) return Promise.reject("receiver required");
    if (!options?.emailSubject) return Promise.reject("email subject required");
    if (!options?.emailText && !options?.emailHTML)
      return Promise.reject("email text or html required");

    await transporter.sendMail({
      from: process.env.SENDER_EMAIL_ID,
      to: options?.receiver,
      subject: options?.emailSubject,
      text: options?.emailText || "",
      html: options?.emailHTML || "",
    });

  } catch (err) {
    throw err;
  }
}
