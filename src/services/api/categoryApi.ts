import { apiRequest } from "./client";

export interface Category {
  id: string;
  user_id: string | null; // null = kategori bawaan
  name: string;
  type: "income" | "expense";
  icon: string | null;
}

/** GET /api/categories */
export const fetchCategories = () => apiRequest<Category[]>("/categories");

/** POST /api/categories */
export const createCategory = (payload: Pick<Category, "name" | "type"> & { icon?: string }) =>
  apiRequest<Category>("/categories", { method: "POST", body: payload });

/** PUT /api/categories/:id */
export const updateCategory = (
  id: string,
  payload: Partial<Pick<Category, "name" | "type" | "icon">>
) => apiRequest<Category>(`/categories/${encodeURIComponent(id)}`, { method: "PUT", body: payload });

/** DELETE /api/categories/:id */
export const deleteCategory = (id: string) =>
  apiRequest<{ message: string; id: string }>(`/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
