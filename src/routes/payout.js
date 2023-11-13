import { Router } from "express";
import { handlePayout } from "../controllers/payout.controller.js";

const router = Router();

router.post('/', handlePayout)

export default router;
