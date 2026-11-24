import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ quiet: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("PERINGATAN: SUPABASE_URL / SUPABASE_KEY belum diisi di file .env");
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

// Klien dasar (anon key). Dipakai untuk memverifikasi token pengguna.
export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseKey || "belum-diisi",
  clientOptions
);

// Klien per-request: membawa JWT pengguna sehingga Row Level Security
// di database hanya mengizinkan akses ke data milik pengguna tersebut.
export const createUserClient = (accessToken) =>
  createClient(supabaseUrl || "http://localhost:54321", supabaseKey || "belum-diisi", {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
