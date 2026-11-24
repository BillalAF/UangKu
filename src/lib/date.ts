/**
 * Helper tanggal berbasis WAKTU LOKAL perangkat (format YYYY-MM-DD).
 * Jangan pakai new Date().toISOString() untuk tanggal transaksi: itu UTC, sehingga
 * di WIB sebelum jam 07.00 hasilnya masih tanggal kemarin.
 */
export function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayStr(): string {
  return toDateString(new Date());
}
