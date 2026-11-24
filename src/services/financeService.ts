import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "../lib/session";
import { todayStr } from "../lib/date";
import {
  createTransaction,
  fetchTransactionById,
  fetchTransactions,
  putTransaction,
  removeTransaction,
} from "./api/transactionApi";
import { fetchFinancialProfile, saveFinancialProfile } from "./api/financialProfileApi";
import {
  AllocationConfig,
  FinanceSummary,
  NewTransaction,
  SmartBudgetCalculation,
  Transaction,
  TransactionType,
  UserFinancialProfile,
} from "../types";

export type {
  AllocationConfig,
  FinanceSummary,
  SmartBudgetCalculation,
  Transaction,
  TransactionType,
  UserFinancialProfile,
};

/**
 * ======================================================================================
 * FINANCE SERVICE (UANGKU)
 * ======================================================================================
 * Sumber data utama: RESTful API UangKu (folder /backend, Express + Supabase).
 * - Baca  : ambil dari API, lalu simpan salinan di perangkat (cache untuk mode offline).
 * - Tulis : dikirim ke API; cache diperbarui setelah server berhasil menyimpan.
 * - Alokasi keuangan DINAMIS (needs + wants + savings = 100%).
 * ======================================================================================
 */

/** Preset yang ditawarkan sebagai rekomendasi (bukan batasan) */
export const ALLOCATION_PRESETS: { label: string; config: AllocationConfig }[] = [
  { label: "50-30-20 (Seimbang)", config: { needs: 50, wants: 30, savings: 20 } },
  { label: "60-20-20 (Prioritas Pokok)", config: { needs: 60, wants: 20, savings: 20 } },
  { label: "70-20-10 (Beban Tinggi)", config: { needs: 70, wants: 20, savings: 10 } },
  { label: "40-40-20 (Gaya Hidup Fleksibel)", config: { needs: 40, wants: 40, savings: 20 } },
];

// ---------------------------------------------------------------------------------------
// CACHE
// ---------------------------------------------------------------------------------------
const CACHE_KEYS = {
  TRANSACTIONS: "@uangku_cache_transactions_v4",
  PROFILE: "@uangku_cache_profile_v4",
};

const MEMORY_TTL_MS = 10_000; // hindari request berulang saat beberapa layar memuat data bersamaan

interface Entry<T> {
  userId: string;
  data: T;
  at: number;
}

let memTransactions: Entry<Transaction[]> | null = null;
let memProfile: Entry<UserFinancialProfile> | null = null;
let transactionsInflight: Promise<Transaction[]> | null = null;
let profileInflight: Promise<UserFinancialProfile> | null = null;

async function readDiskCache<T>(key: string, userId: string | null): Promise<T | null> {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId: string; data: T };
    return parsed.userId === userId ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeDiskCache<T>(key: string, userId: string, data: T) {
  AsyncStorage.setItem(key, JSON.stringify({ userId, data })).catch(() => {});
}

function setTransactionsCache(userId: string, list: Transaction[]) {
  memTransactions = { userId, data: list, at: Date.now() };
  writeDiskCache(CACHE_KEYS.TRANSACTIONS, userId, list);
}

function setProfileCache(userId: string, profile: UserFinancialProfile) {
  memProfile = { userId, data: profile, at: Date.now() };
  writeDiskCache(CACHE_KEYS.PROFILE, userId, profile);
}

// ---------------------------------------------------------------------------------------
// LISTENER (refresh otomatis antar layar)
// ---------------------------------------------------------------------------------------
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export const subscribeFinanceUpdates = (callback: Listener): (() => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

const notifyListeners = () => {
  listeners.forEach((callback) => {
    try {
      callback();
    } catch (e) {
      console.warn("Error in finance listener callback:", e);
    }
  });
};

// Saat akun berganti / keluar: buang cache milik akun sebelumnya dan segarkan layar.
let lastUserId: string | null | undefined;
supabase.auth.onAuthStateChange((_event, session) => {
  const id = session?.user?.id ?? null;
  const changed = lastUserId !== undefined && id !== lastUserId;
  lastUserId = id;
  if (!changed) return;

  memTransactions = null;
  memProfile = null;
  if (!id) AsyncStorage.multiRemove(Object.values(CACHE_KEYS)).catch(() => {});
  // dijadwalkan ulang agar tidak memanggil Supabase di dalam callback auth (menghindari deadlock)
  setTimeout(notifyListeners, 0);
});

// ---------------------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------------------
export function getAllocationLabel(config: AllocationConfig): string {
  return `${config.needs}-${config.wants}-${config.savings}`;
}

export function validateAllocation(config: AllocationConfig): { valid: boolean; total: number } {
  const total = Math.round(config.needs + config.wants + config.savings);
  return { valid: total === 100, total };
}

// ---------------------------------------------------------------------------------------
// 1. PROFIL KEUANGAN (gaji & alokasi) -> GET/PUT /api/financial-profile
// ---------------------------------------------------------------------------------------
export async function getUserFinancialProfile(): Promise<UserFinancialProfile> {
  const userId = await getCurrentUserId();

  if (memProfile && memProfile.userId === userId && Date.now() - memProfile.at < MEMORY_TTL_MS) {
    return memProfile.data;
  }
  if (profileInflight) return profileInflight;

  profileInflight = (async () => {
    try {
      const profile = await fetchFinancialProfile();
      const id = (await getCurrentUserId()) || userId;
      if (id) setProfileCache(id, profile);
      return profile;
    } catch (err) {
      const cached = await readDiskCache<UserFinancialProfile>(CACHE_KEYS.PROFILE, userId);
      if (cached) return cached;
      throw err;
    } finally {
      profileInflight = null;
    }
  })();

  return profileInflight;
}

export async function setUserFinancialProfile(
  income: number,
  allocation: AllocationConfig
): Promise<UserFinancialProfile> {
  const { valid, total } = validateAllocation(allocation);
  if (!valid) {
    throw new Error(`Total alokasi harus tepat 100% (sekarang ${total}%).`);
  }

  const saved = await saveFinancialProfile(Math.abs(Number(income)) || 0, {
    needs: Math.round(allocation.needs),
    wants: Math.round(allocation.wants),
    savings: Math.round(allocation.savings),
  });

  const userId = await getCurrentUserId();
  if (userId) setProfileCache(userId, saved);

  notifyListeners();
  return saved;
}

// ---------------------------------------------------------------------------------------
// 2. KALKULASI PREDIKSI KEUANGAN PINTAR & JATAH HARIAN DENGAN ROLLOVER
// ---------------------------------------------------------------------------------------
export async function calculateSmartBudget(): Promise<SmartBudgetCalculation> {
  const [profile, transactions] = await Promise.all([
    getUserFinancialProfile(),
    getTransactions(),
  ]);
  const alloc = profile.allocation;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, totalDaysInMonth - currentDay + 1);

  const todayDateStr = todayStr();
  const currentMonthPrefix = todayDateStr.substring(0, 7);

  const monthlyIncome = profile.monthlyIncome;
  const spendableRatio = (alloc.needs + alloc.wants) / 100;

  const needsBudget = Math.round(monthlyIncome * (alloc.needs / 100));
  const wantsBudget = Math.round(monthlyIncome * (alloc.wants / 100));
  const baseSavingsBudget = Math.round(monthlyIncome * (alloc.savings / 100));

  // Uang belanja dasar bulan ini (Kebutuhan + Keinginan)
  const baseSpendable = needsBudget + wantsBudget;

  let monthlyExpense = 0;
  let pastDaysExpense = 0;
  let todayExpense = 0;

  let monthlyIncomeExtra = 0;
  let pastDaysIncomeExtra = 0;
  let todayIncome = 0;

  for (const tx of transactions) {
    if (tx.date.startsWith(currentMonthPrefix)) {
      if (tx.type === "expense") {
        monthlyExpense += tx.amount;
        if (tx.date === todayDateStr) {
          todayExpense += tx.amount;
        } else if (tx.date < todayDateStr) {
          pastDaysExpense += tx.amount;
        }
      } else if (tx.type === "income") {
        monthlyIncomeExtra += tx.amount;
        if (tx.date === todayDateStr) {
          todayIncome += tx.amount;
        } else if (tx.date < todayDateStr) {
          pastDaysIncomeExtra += tx.amount;
        }
      }
    }
  }

  // Pemasukan tambahan dialokasikan sesuai proporsi belanja dan tabungan
  const extraSpendable = Math.round(monthlyIncomeExtra * spendableRatio);
  const extraSavings = monthlyIncomeExtra - extraSpendable;

  const monthlySpendable = baseSpendable + extraSpendable;
  const savingsBudget = baseSavingsBudget + extraSavings;

  // Sisa uang belanja bulan ini langsung berkurang saat ada pengeluaran (dapat minus jika defisit)
  const remainingSpendableMonth = monthlySpendable - monthlyExpense;

  // Rollover: akumulasi sisa belanja hari-hari sebelumnya dibagi rata ke sisa hari di bulan ini
  const pastDaysNetSpend = pastDaysExpense - Math.round(pastDaysIncomeExtra * spendableRatio);
  const budgetLeftForRemainingDays = baseSpendable - pastDaysNetSpend;
  const todayAllowance = Math.round(Math.max(0, budgetLeftForRemainingDays) / daysRemainingInMonth);

  // Uang harian bertambah sesuai pemasukan yang didapat hari ini
  const todaySpendableIncome = Math.round(todayIncome * spendableRatio);

  // Jatah uang hari ini: bertambah saat ada pemasukan, berkurang saat ada pengeluaran.
  // Jika pengeluaran melebihi jatah harian, bernilai MINUS (tidak dipaksa berhenti di 0).
  const todayAvailable = todayAllowance + todaySpendableIncome - todayExpense;

  return {
    monthlyIncome,
    allocation: alloc,
    allocationLabel: getAllocationLabel(alloc),
    needsBudget,
    wantsBudget,
    savingsBudget,
    monthlySpendable,
    monthlyExpense,
    remainingSpendableMonth,
    todayAllowance,
    todayExpense,
    todayIncome,
    todayAvailable,
    daysRemainingInMonth,
    totalDaysInMonth,
    currentDay,
  };
}

// ---------------------------------------------------------------------------------------
// 3. TRANSAKSI -> /api/transactions
// ---------------------------------------------------------------------------------------

/** GET /api/transactions */
export async function getTransactions(): Promise<Transaction[]> {
  const userId = await getCurrentUserId();

  if (
    memTransactions &&
    memTransactions.userId === userId &&
    Date.now() - memTransactions.at < MEMORY_TTL_MS
  ) {
    return memTransactions.data;
  }
  if (transactionsInflight) return transactionsInflight;

  transactionsInflight = (async () => {
    try {
      const list = await fetchTransactions();
      const id = (await getCurrentUserId()) || userId;
      if (id) setTransactionsCache(id, list);
      return list;
    } catch (err) {
      // Server tidak terjangkau: pakai salinan terakhir di perangkat bila ada
      const cached = await readDiskCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, userId);
      if (cached) return cached;
      throw err;
    } finally {
      transactionsInflight = null;
    }
  })();

  return transactionsInflight;
}

/** GET /api/transactions/:id */
export async function getTransactionById(id: string): Promise<Transaction | null> {
  try {
    return await fetchTransactionById(id);
  } catch (err) {
    // Fallback ke data yang sudah dimuat/cache jika server tidak terjangkau
    const list = await getTransactions();
    return list.find((t) => t.id === id) || null;
  }
}

/** POST /api/transactions */
export async function addTransaction(payload: NewTransaction): Promise<Transaction> {
  const body: NewTransaction = {
    title: payload.title.trim(),
    amount: Math.abs(Number(payload.amount)) || 0,
    type: payload.type,
    category: payload.category || (payload.type === "income" ? "Pemasukan" : "Lainnya"),
    wallet: payload.wallet || "Tunai",
    date: payload.date || todayStr(),
  };

  const created = await createTransaction(body);

  const userId = await getCurrentUserId();
  if (userId && memTransactions && memTransactions.userId === userId) {
    setTransactionsCache(userId, [created, ...memTransactions.data]);
  } else {
    memTransactions = null;
  }

  notifyListeners();
  return created;
}

/** PUT /api/transactions/:id */
export async function updateTransaction(
  id: string,
  updates: Partial<Omit<Transaction, "id">>
): Promise<Transaction | null> {
  const body: Partial<NewTransaction> = { ...updates };
  delete (body as any).created_at;
  if (updates.amount !== undefined) body.amount = Math.abs(Number(updates.amount));

  const updated = await putTransaction(id, body);
  if (!updated) return null;

  const userId = await getCurrentUserId();
  if (userId && memTransactions && memTransactions.userId === userId) {
    setTransactionsCache(
      userId,
      memTransactions.data.map((t) => (t.id === id ? updated : t))
    );
  } else {
    memTransactions = null;
  }

  notifyListeners();
  return updated;
}

/** DELETE /api/transactions/:id */
export async function deleteTransaction(id: string): Promise<boolean> {
  await removeTransaction(id);

  const userId = await getCurrentUserId();
  if (userId && memTransactions && memTransactions.userId === userId) {
    setTransactionsCache(
      userId,
      memTransactions.data.filter((t) => t.id !== id)
    );
  } else {
    memTransactions = null;
  }

  notifyListeners();
  return true;
}

// ---------------------------------------------------------------------------------------
// 4. LAIN-LAIN
// ---------------------------------------------------------------------------------------

/** Mengatur gaji bulanan tanpa mengubah alokasi */
export async function setMonthlyBaseIncome(amount: number): Promise<void> {
  const validAmount = Math.abs(Number(amount)) || 0;
  const profile = await getUserFinancialProfile();
  await setUserFinancialProfile(validAmount, profile.allocation);
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const [transactions, profile] = await Promise.all([getTransactions(), getUserFinancialProfile()]);

  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of transactions) {
    if (tx.type === "income") totalIncome += tx.amount;
    else totalExpense += tx.amount;
  }

  return {
    totalBalance: totalIncome - totalExpense,
    monthlyIncome: totalIncome,
    monthlyExpense: totalExpense,
    monthlyBaseIncome: profile.monthlyIncome,
  };
}

/** Membersihkan salinan data di perangkat (data di server tidak dihapus) */
export async function clearAllData(): Promise<void> {
  memTransactions = null;
  memProfile = null;
  await AsyncStorage.multiRemove(Object.values(CACHE_KEYS));
  notifyListeners();
}

/** Format rupiah rapi tanpa desimal (mendukung nominal minus) */
export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded < 0) {
    return "-Rp " + Math.abs(rounded).toLocaleString("id-ID");
  }
  return "Rp " + rounded.toLocaleString("id-ID");
}
