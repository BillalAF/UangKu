import { supabase, createUserClient } from "../config/supabaseClient.js";

/**
 * Middleware autentikasi.
 * Klien (aplikasi mobile) mengirim header:  Authorization: Bearer <access_token Supabase>
 * Token diverifikasi ke Supabase Auth, lalu req.db disiapkan agar semua query
 * model berjalan atas nama pengguna tersebut (RLS aktif).
 */
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res
      .status(401)
      .json({ error: "Autentikasi diperlukan. Kirim header Authorization: Bearer <token>" });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Token tidak valid atau sudah kedaluwarsa" });
    }

    req.user = data.user;
    req.db = createUserClient(token);
    next();
  } catch (err) {
    res.status(500).json({ error: "Gagal memverifikasi token: " + err.message });
  }
}
