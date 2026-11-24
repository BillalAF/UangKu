import { API_BASE_URL } from "../../lib/config";
import { getAccessToken } from "../../lib/session";

/**
 * HTTP client ke RESTful API UangKu (backend Express - Modul 1).
 * Otomatis menyertakan token Supabase pengguna pada header Authorization.
 */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_TIMEOUT_MS = 20000; // server serverless bisa lambat saat cold start

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const token = await getAccessToken();
  if (!token) {
    throw new ApiError("Sesi tidak ditemukan. Silakan masuk ke akun terlebih dahulu.", 401);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: any) {
    const reason = err?.name === "AbortError" ? "server tidak merespons" : "tidak ada koneksi";
    throw new ApiError(`Tidak dapat terhubung ke server (${reason}).`, 0);
  } finally {
    clearTimeout(timer);
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // body kosong / bukan JSON
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.error || `Permintaan gagal (HTTP ${response.status})`,
      response.status,
      payload?.code
    );
  }

  return payload as T;
}
