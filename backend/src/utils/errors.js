/**
 * Memetakan error Supabase/PostgREST ke status HTTP yang tepat.
 * fallback = status default (400 untuk operasi tulis, 500 untuk baca).
 */
export function statusFromError(err, fallback = 500) {
  const code = err?.code || "";
  if (code === "PGRST116") return 404; // data tidak ditemukan
  if (code === "42501") return 403; // ditolak oleh RLS / hak akses
  if (code.startsWith("22") || code.startsWith("23")) return 400; // data tidak valid / melanggar constraint
  if (code === "PGRST301" || code === "PGRST303") return 401; // JWT bermasalah
  return fallback;
}

export function sendError(res, err, fallback = 500) {
  res.status(statusFromError(err, fallback)).json({ error: err?.message || "Terjadi kesalahan" });
}
