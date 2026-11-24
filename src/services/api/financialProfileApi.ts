import { AllocationConfig, UserFinancialProfile } from "../../types";
import { apiRequest } from "./client";

function toProfile(raw: any): UserFinancialProfile {
  return {
    monthlyIncome: Number(raw.monthly_income) || 0,
    allocation: {
      needs: Number(raw.needs_pct),
      wants: Number(raw.wants_pct),
      savings: Number(raw.savings_pct),
    },
    updatedAt: raw.updated_at || new Date().toISOString(),
  };
}

/** GET /api/financial-profile */
export async function fetchFinancialProfile(): Promise<UserFinancialProfile> {
  return toProfile(await apiRequest<any>("/financial-profile"));
}

/** PUT /api/financial-profile */
export async function saveFinancialProfile(
  monthlyIncome: number,
  allocation: AllocationConfig
): Promise<UserFinancialProfile> {
  const saved = await apiRequest<any>("/financial-profile", {
    method: "PUT",
    body: {
      monthly_income: monthlyIncome,
      needs_pct: allocation.needs,
      wants_pct: allocation.wants,
      savings_pct: allocation.savings,
    },
  });
  return toProfile(saved);
}
