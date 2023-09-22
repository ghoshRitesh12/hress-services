import express from "express";
import { config } from "dotenv";
import { hash, compare } from "bcrypt";

config();
const app = express();
const PORT = process.env.PORT || 7100;

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

app.get('/', async (req, res) => {
  // should be sent by the main server
  const key = (await hash(process.env.HRESS_SERVICE_TOKEN, Number(process.env.TOKEN_SALT)))

  const isEqual = await compare(process.env.HRESS_SERVICE_TOKEN, key);

  res.json({
    key,
    isEqual
  });

  await sleep(2000);
  console.log("WELL HELLO THERE")
})

app.listen(PORT, () => {
  console.log(`Server @ http://localhost:${PORT}`)
})
