export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  wallet: string;
  date: string; // YYYY-MM-DD
  created_at?: string;
}

export type NewTransaction = Omit<Transaction, "id" | "created_at">;

/**
 * Alokasi keuangan dinamis: user bebas menentukan persentase
 * selama needs + wants + savings === 100.
 */
export interface AllocationConfig {
  needs: number; // % Kebutuhan Pokok
  wants: number; // % Keinginan / Gaya Hidup
  savings: number; // % Tabungan / Investasi
}

export interface UserFinancialProfile {
  monthlyIncome: number;
  allocation: AllocationConfig;
  updatedAt: string;
}

export interface SmartBudgetCalculation {
  monthlyIncome: number;
  allocation: AllocationConfig;
  allocationLabel: string;
  needsBudget: number;
  wantsBudget: number;
  savingsBudget: number;
  monthlySpendable: number;
  monthlyExpense: number;
  remainingSpendableMonth: number;
  todayAllowance: number;
  todayExpense: number;
  todayIncome: number;
  todayAvailable: number;
  daysRemainingInMonth: number;
  totalDaysInMonth: number;
  currentDay: number;
}

export interface FinanceSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBaseIncome: number;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  actionRecorded?: boolean;
}

export interface FinancialAction {
  action: "ADD_TRANSACTION" | "SET_BASE_INCOME" | "SET_ALLOCATION";
  title?: string;
  amount: number;
  type?: TransactionType;
  category?: string;
  wallet?: string;
  needs?: number;
  wants?: number;
  savings?: number;
}

export interface ChatResponseResult {
  message: string;
  action?: FinancialAction;
}
