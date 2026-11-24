/**
 * MODEL: CATEGORY
 * Kategori bawaan (user_id NULL) dapat dibaca semua pengguna.
 * Kategori buatan sendiri hanya dapat diubah/dihapus oleh pemiliknya (diatur RLS).
 */
export const CategoryModel = {
  async getAll(db) {
    const { data, error } = await db
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  },

  async getById(db, id) {
    const { data, error } = await db
      .from("categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(db, payload) {
    const { data, error } = await db
      .from("categories")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(db, id, payload) {
    const { data, error } = await db
      .from("categories")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async remove(db, id) {
    const { data, error } = await db
      .from("categories")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    return data.length > 0;
  },
};
