export function notFound(req, res) {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan` });
}

// Penanganan error terpusat (JSON tidak valid, dll.)
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: status === 500 ? "Terjadi kesalahan pada server" : err.message });
}
