/**
 * MODEL: FINANCIAL PROFILE
 * Satu baris per pengguna: gaji bulanan + alokasi Kebutuhan / Keinginan / Tabungan.
 */
export const DEFAULT_PROFILE = {
  monthly_income: 0,
  needs_pct: 50,
  wants_pct: 30,
  savings_pct: 20,
  updated_at: null,
};

export const FinancialProfileModel = {
  async get(db, userId) {
    const { data, error } = await db
      .from("financial_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data || { user_id: userId, ...DEFAULT_PROFILE };
  },

  async upsert(db, userId, payload) {
    const { data, error } = await db
      .from("financial_profiles")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
