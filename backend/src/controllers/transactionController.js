import { TransactionModel } from "../models/transactionModel.js";
import { parseTransactionInput } from "../utils/validators.js";
import { sendError } from "../utils/errors.js";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const TransactionController = {
  async getAll(req, res) {
    try {
      const { month, from, to, type, limit } = req.query;
      if (month && !MONTH_PATTERN.test(month)) {
        return res.status(400).json({ error: "month harus berformat YYYY-MM" });
      }
      if (type && !["income", "expense"].includes(type)) {
        return res.status(400).json({ error: "type harus 'income' atau 'expense'" });
      }
      const transactions = await TransactionModel.getAll(req.db, { month, from, to, type, limit });
      res.json(transactions);
    } catch (err) {
      sendError(res, err, 500);
    }
  },

  async getById(req, res) {
    try {
      const transaction = await TransactionModel.getById(req.db, req.params.id);
      if (!transaction) return res.status(404).json({ error: "Transaksi tidak ditemukan" });
      res.json(transaction);
    } catch (err) {
      sendError(res, err, 400);
    }
  },

  async create(req, res) {
    try {
      const { errors, data } = parseTransactionInput(req.body);
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });

      const transaction = await TransactionModel.create(req.db, data);
      res.status(201).json(transaction);
    } catch (err) {
      sendError(res, err, 400);
    }
  },

  async update(req, res) {
    try {
      const { errors, data } = parseTransactionInput(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Tidak ada field yang diubah" });
      }

      const transaction = await TransactionModel.update(req.db, req.params.id, data);
      if (!transaction) return res.status(404).json({ error: "Transaksi tidak ditemukan" });
      res.json(transaction);
    } catch (err) {
      sendError(res, err, 400);
    }
  },

  async remove(req, res) {
    try {
      const deleted = await TransactionModel.remove(req.db, req.params.id);
      if (!deleted) return res.status(404).json({ error: "Transaksi tidak ditemukan" });
      res.json({ message: "Transaksi berhasil dihapus", id: req.params.id });
    } catch (err) {
      sendError(res, err, 400);
    }
  },
};
