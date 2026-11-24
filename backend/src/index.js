import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import financialProfileRoutes from "./routes/financialProfileRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { requireAuth } from "./middleware/auth.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config({ quiet: true });

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Endpoint publik untuk cek kesehatan server
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "RESTful API UangKu berjalan normal",
    endpoints: [
      "/api/transactions",
      "/api/categories",
      "/api/financial-profile",
      "/api/chat",
    ],
  });
});

// Semua endpoint /api membutuhkan token Supabase milik pengguna
app.use("/api", requireAuth);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/financial-profile", financialProfileRoutes);
app.use("/api/chat", chatRoutes);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

// Di Vercel server dijalankan sebagai serverless function, jadi tidak perlu listen.
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
