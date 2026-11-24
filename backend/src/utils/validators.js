const TRANSACTION_TYPES = ["income", "expense"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

function cleanText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

/**
 * Validasi body transaksi. partial=true dipakai untuk PUT (hanya field yang dikirim yang dicek).
 * Mengembalikan { errors: string[], data: object } - data hanya berisi kolom yang diizinkan.
 */
export function parseTransactionInput(body = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.title !== undefined) {
    const title = cleanText(body.title);
    if (!title) errors.push("title wajib diisi");
    else if (title.length > 120) errors.push("title maksimal 120 karakter");
    else data.title = title;
  }

  if (!partial || body.amount !== undefined) {
    const amount = Number(body.amount);
    if (body.amount === undefined || body.amount === null || body.amount === "")
      errors.push("amount wajib diisi");
    else if (!Number.isFinite(amount) || amount < 0)
      errors.push("amount harus berupa angka >= 0");
    else data.amount = Math.round(amount * 100) / 100;
  }

  if (!partial || body.type !== undefined) {
    const type = body.type === undefined ? "expense" : body.type;
    if (!TRANSACTION_TYPES.includes(type)) errors.push("type harus 'income' atau 'expense'");
    else data.type = type;
  }

  if (!partial || body.category !== undefined) {
    const category = cleanText(body.category, "Lainnya") || "Lainnya";
    data.category = category.slice(0, 50);
  }

  if (!partial || body.wallet !== undefined) {
    const wallet = cleanText(body.wallet, "Tunai") || "Tunai";
    data.wallet = wallet.slice(0, 50);
  }

  if (body.date !== undefined) {
    if (!isRealDate(body.date)) errors.push("date harus berformat YYYY-MM-DD");
    else data.date = body.date;
  }

  return { errors, data };
}

export function parseCategoryInput(body = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = cleanText(body.name);
    if (!name) errors.push("name wajib diisi");
    else if (name.length > 50) errors.push("name maksimal 50 karakter");
    else data.name = name;
  }

  if (!partial || body.type !== undefined) {
    const type = body.type === undefined ? "expense" : body.type;
    if (!TRANSACTION_TYPES.includes(type)) errors.push("type harus 'income' atau 'expense'");
    else data.type = type;
  }

  if (body.icon !== undefined) data.icon = cleanText(body.icon).slice(0, 50) || null;

  return { errors, data };
}

export function parseFinancialProfileInput(body = {}) {
  const errors = [];
  const income = Number(body.monthly_income);
  const needs = Number(body.needs_pct);
  const wants = Number(body.wants_pct);
  const savings = Number(body.savings_pct);

  if (!Number.isFinite(income) || income < 0) errors.push("monthly_income harus berupa angka >= 0");

  for (const [name, value] of [
    ["needs_pct", needs],
    ["wants_pct", wants],
    ["savings_pct", savings],
  ]) {
    if (!Number.isInteger(value) || value < 0 || value > 100)
      errors.push(`${name} harus bilangan bulat 0-100`);
  }

  if (errors.length === 0 && needs + wants + savings !== 100) {
    errors.push(`Total alokasi harus tepat 100% (sekarang ${needs + wants + savings}%)`);
  }

  return {
    errors,
    data: {
      monthly_income: Math.round(income * 100) / 100,
      needs_pct: needs,
      wants_pct: wants,
      savings_pct: savings,
    },
  };
}
