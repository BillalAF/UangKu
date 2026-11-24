/**
 * MODEL: TRANSACTION
 * Semua method menerima `db` (klien Supabase milik pengguna yang sedang login),
 * sehingga RLS di database otomatis membatasi data ke milik pengguna tsb.
 */
const MAX_ROWS = 2000;

function nextMonthStart(month) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1)); // m sudah 1-based, jadi ini awal bulan berikutnya
  return d.toISOString().slice(0, 10);
}

export const TransactionModel = {
  async getAll(db, { month, from, to, type, limit } = {}) {
    let query = db
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(limit) || MAX_ROWS, MAX_ROWS));

    if (month) query = query.gte("date", `${month}-01`).lt("date", nextMonthStart(month));
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(db, id) {
    const { data, error } = await db
      .from("transactions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data; // null jika tidak ada
  },

  async create(db, payload) {
    const { data, error } = await db
      .from("transactions")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(db, id, payload) {
    const { data, error } = await db
      .from("transactions")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data; // null jika tidak ada
  },

  async remove(db, id) {
    const { data, error } = await db
      .from("transactions")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    return data.length > 0;
  },
};
