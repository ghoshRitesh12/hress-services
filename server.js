import express from "express";
import { config } from "dotenv";

config();
const app = express();
const PORT = process.env.PORT || 7100;

app.get('/', (req, res) => {
  res.json('henlo nighgha');
})

app.listen(PORT, () => {
  console.log(`Server @ http://localhost:${PORT}`)
})
