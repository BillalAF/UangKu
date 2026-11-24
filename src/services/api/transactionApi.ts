import { NewTransaction, Transaction } from "../../types";
import { apiRequest } from "./client";

// Normalisasi data dari server (numeric bisa berupa string, date bisa membawa jam)
function normalize(raw: any): Transaction {
  return {
    id: String(raw.id),
    title: raw.title,
    amount: Number(raw.amount) || 0,
    type: raw.type,
    category: raw.category,
    wallet: raw.wallet,
    date: String(raw.date).slice(0, 10),
    created_at: raw.created_at,
  };
}

/** GET /api/transactions */
export async function fetchTransactions(): Promise<Transaction[]> {
  const list = await apiRequest<any[]>("/transactions");
  return list.map(normalize);
}

/** GET /api/transactions/:id  (null jika tidak ditemukan) */
export async function fetchTransactionById(id: string): Promise<Transaction | null> {
  try {
    return normalize(await apiRequest<any>(`/transactions/${encodeURIComponent(id)}`));
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

/** POST /api/transactions */
export async function createTransaction(payload: NewTransaction): Promise<Transaction> {
  return normalize(await apiRequest<any>("/transactions", { method: "POST", body: payload }));
}

/** PUT /api/transactions/:id  (null jika tidak ditemukan) */
export async function putTransaction(
  id: string,
  updates: Partial<NewTransaction>
): Promise<Transaction | null> {
  try {
    return normalize(
      await apiRequest<any>(`/transactions/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: updates,
      })
    );
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

/** DELETE /api/transactions/:id */
export async function removeTransaction(id: string): Promise<void> {
  await apiRequest(`/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
}
