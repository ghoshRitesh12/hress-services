import morgan from "morgan";
import express from "express";
import { config } from "dotenv";

import connectDB from "./config/connectDB.js";
import errorHandler from "./config/errorHandler.js";
import notFoundHandler from "./config/notFoundHandler.js";

import payoutRouter from "./routes/payout.js";
import { checkReqValidity } from "./middlewares/validity.js";

config();
const app = express();
const PORT = process.env.PORT || 7001;

app.use(morgan("dev"));
app.use(express.json());

(async function () {
  await connectDB();

  // app.use("/payout", payoutRouter);
  app.use("/payout", checkReqValidity, payoutRouter);
  app.get("/health", (_, res) => res.sendStatus(200));

  app.use(notFoundHandler)
  app.use(errorHandler)
})()

app.listen(PORT, function () {
  console.log(`Server @ http://localhost:${PORT}`)
})
