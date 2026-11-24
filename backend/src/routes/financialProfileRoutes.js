import express from "express";
import { FinancialProfileController } from "../controllers/financialProfileController.js";

const router = express.Router();

router.get("/", FinancialProfileController.get);
router.put("/", FinancialProfileController.save);

export default router;
