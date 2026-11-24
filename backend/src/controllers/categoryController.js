import { CategoryModel } from "../models/categoryModel.js";
import { parseCategoryInput } from "../utils/validators.js";
import { sendError } from "../utils/errors.js";

export const CategoryController = {
  async getAll(req, res) {
    try {
      res.json(await CategoryModel.getAll(req.db));
    } catch (err) {
      sendError(res, err, 500);
    }
  },

  async getById(req, res) {
    try {
      const category = await CategoryModel.getById(req.db, req.params.id);
      if (!category) return res.status(404).json({ error: "Kategori tidak ditemukan" });
      res.json(category);
    } catch (err) {
      sendError(res, err, 400);
    }
  },

  async create(req, res) {
    try {
      const { errors, data } = parseCategoryInput(req.body);
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });

      const category = await CategoryModel.create(req.db, data);
      res.status(201).json(category);
    } catch (err) {
      sendError(res, err, 400);
    }
  },

  async update(req, res) {
    try {
      const { errors, data } = parseCategoryInput(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Tidak ada field yang diubah" });
      }

      const category = await CategoryModel.update(req.db, req.params.id, data);
      if (!category) {
        return res
          .status(404)
          .json({ error: "Kategori tidak ditemukan (kategori bawaan tidak dapat diubah)" });
      }
      res.json(category);
    } catch (err) {
      sendError(res, err, 400);
    }
  },

  async remove(req, res) {
    try {
      const deleted = await CategoryModel.remove(req.db, req.params.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ error: "Kategori tidak ditemukan (kategori bawaan tidak dapat dihapus)" });
      }
      res.json({ message: "Kategori berhasil dihapus", id: req.params.id });
    } catch (err) {
      sendError(res, err, 400);
    }
  },
};
