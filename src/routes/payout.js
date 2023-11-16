import { Router } from "express";
import { handlePayout } from "../controllers/payout.controller.js";
import { handlePayoutPDFGen } from "../controllers/payout-pdf.controller.js";

const router = Router();

router.post("/", handlePayout);
router.post("/pdf", handlePayoutPDFGen);

export default router;
