import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Manajemen sesi. Semua request ke API membutuhkan token Supabase.
 * Jika pengguna belum login ("Nanti Saja"), dibuatkan sesi tamu (anonymous sign-in)
 * agar data tetap tersimpan di server dan terpisah dari pengguna lain.
 * Aktifkan di Supabase: Authentication > Sign In / Providers > Allow anonymous sign-ins.
 */
let pending: Promise<boolean> | null = null;

export function ensureSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) return Promise.resolve(false);

  if (!pending) {
    pending = (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) return true;

        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.warn("Sesi tamu gagal dibuat:", error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn("ensureSession error:", e);
        return false;
      }
    })();
    pending.finally(() => {
      pending = null;
    });
  }
  return pending;
}

export async function getAccessToken(): Promise<string | null> {
  if (!(await ensureSession())) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}
