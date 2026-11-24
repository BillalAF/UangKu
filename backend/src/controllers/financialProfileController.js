import { FinancialProfileModel } from "../models/financialProfileModel.js";
import { parseFinancialProfileInput } from "../utils/validators.js";
import { sendError } from "../utils/errors.js";

export const FinancialProfileController = {
  async get(req, res) {
    try {
      res.json(await FinancialProfileModel.get(req.db, req.user.id));
    } catch (err) {
      sendError(res, err, 500);
    }
  },

  async save(req, res) {
    try {
      const { errors, data } = parseFinancialProfileInput(req.body);
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });

      res.json(await FinancialProfileModel.upsert(req.db, req.user.id, data));
    } catch (err) {
      sendError(res, err, 400);
    }
  },
};
