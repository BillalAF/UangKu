import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { ensureSession } from "../lib/session";

WebBrowser.maybeCompleteAuthSession();

/**
 * ======================================================================================
 * AUTH & USER PROFILE SERVICE (UANGKU)
 * ======================================================================================
 * Autentikasi memakai Supabase Auth (email/password & Google). Token sesi dikirim ke
 * RESTful API UangKu sehingga setiap pengguna hanya mengakses datanya sendiri.
 *
 * Pengguna yang belum masuk ("Nanti Saja") memakai sesi tamu (anonymous). Sesi tamu
 * dianggap "belum masuk akun" oleh UI (getCurrentUser mengembalikan null).
 * ======================================================================================
 */

export type UserGender = "Laki-laki" | "Perempuan";
export type UserStatus = "Mahasiswa" | "Siswa" | "Pekerja" | "Lainnya";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  birthDate: string; // Format: YYYY-MM-DD
  gender: UserGender;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
}

// Preset avatar ilustrasi minimalis yang siap dipakai langsung tanpa upload file berat
export const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80",
];

// ---------------------------------------------------------------------------------------
// Listener perubahan akun
// ---------------------------------------------------------------------------------------
type AuthListener = (user: UserProfile | null) => void;
const authListeners: Set<AuthListener> = new Set();

export const subscribeAuthUpdates = (callback: AuthListener): (() => void) => {
  authListeners.add(callback);
  return () => {
    authListeners.delete(callback);
  };
};

const notifyAuthListeners = (user: UserProfile | null) => {
  authListeners.forEach((callback) => {
    try {
      callback(user);
    } catch (e) {
      console.warn("Error in auth listener:", e);
    }
  });
};

// ---------------------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------------------
function mapUser(user: User | null | undefined): UserProfile | null {
  if (!user || user.is_anonymous) return null; // sesi tamu = belum masuk akun

  const meta = (user.user_metadata || {}) as Record<string, any>;
  const email = user.email || "";

  return {
    id: user.id,
    email,
    fullName: meta.full_name || meta.fullName || meta.name || email.split("@")[0] || "Pengguna",
    birthDate: meta.birth_date || meta.birthDate || "",
    gender: (meta.gender as UserGender) || "Laki-laki",
    status: (meta.status as UserStatus) || "Mahasiswa",
    avatarUrl: meta.avatar_url || meta.avatarUrl || meta.picture || null,
    createdAt: user.created_at || new Date().toISOString(),
  };
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email atau kata sandi tidak sesuai.";
  if (m.includes("email not confirmed"))
    return "Email belum dikonfirmasi. Cek kotak masuk emailmu lalu coba masuk lagi.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Email ini sudah terdaftar. Silakan masuk.";
  if (m.includes("password should be at least")) return "Kata sandi minimal 6 karakter.";
  if (m.includes("rate limit")) return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
  if (m.includes("network") || m.includes("fetch")) return "Tidak ada koneksi internet.";
  return message;
}

const NOT_CONFIGURED_ERROR =
  "Supabase belum dikonfigurasi. Isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY di file .env.";

// Satu-satunya sumber kebenaran status akun: sesi Supabase.
// Dijadwalkan ulang (setTimeout) agar tidak memanggil Supabase di dalam callback auth.
supabase.auth.onAuthStateChange((_event, session) => {
  const profile = mapUser(session?.user);
  setTimeout(() => notifyAuthListeners(profile), 0);
});

export { ensureSession };

// ---------------------------------------------------------------------------------------
// 1. PROFIL PENGGUNA YANG SEDANG AKTIF
// ---------------------------------------------------------------------------------------
export async function getCurrentUser(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return mapUser(data.session?.user);
  } catch (err) {
    console.warn("Gagal membaca sesi pengguna:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------------------
// 2. REGISTRASI AKUN BARU
// ---------------------------------------------------------------------------------------
export async function registerUser(payload: {
  email: string;
  password?: string;
  fullName: string;
  birthDate: string;
  gender: UserGender;
  status: UserStatus;
  avatarUrl?: string | null;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanName = payload.fullName.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Silakan masukkan alamat email yang valid." };
  }
  if (!payload.password || payload.password.length < 6) {
    return { success: false, error: "Kata sandi minimal 6 karakter." };
  }
  if (!cleanName) {
    return { success: false, error: "Silakan masukkan nama lengkap Anda." };
  }
  if (!payload.birthDate) {
    return { success: false, error: "Silakan masukkan tanggal lahir Anda." };
  }
  if (!isSupabaseConfigured()) {
    return { success: false, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: payload.password,
      options: {
        data: {
          full_name: cleanName,
          birth_date: payload.birthDate,
          gender: payload.gender,
          status: payload.status,
          avatar_url: payload.avatarUrl || null,
        },
      },
    });

    if (error) return { success: false, error: translateAuthError(error.message) };

    // Jika "Confirm email" aktif di Supabase, sesi baru ada setelah email dikonfirmasi
    if (!data.session) {
      return {
        success: false,
        error: "Akun berhasil dibuat. Cek emailmu untuk konfirmasi, lalu masuk dengan akun tersebut.",
      };
    }

    return { success: true, user: mapUser(data.user) || undefined };
  } catch (e: any) {
    return { success: false, error: translateAuthError(e?.message || "Gagal mendaftar.") };
  }
}

// ---------------------------------------------------------------------------------------
// 3. LOGIN DENGAN EMAIL & PASSWORD
// ---------------------------------------------------------------------------------------
export async function loginWithEmail(
  email: string,
  password?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Silakan masukkan alamat email yang valid." };
  }
  if (!password) {
    return { success: false, error: "Silakan masukkan kata sandi Anda." };
  }
  if (!isSupabaseConfigured()) {
    return { success: false, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error || !data.user) {
      return { success: false, error: translateAuthError(error?.message || "Gagal masuk.") };
    }
    return { success: true, user: mapUser(data.user) || undefined };
  } catch (e: any) {
    return { success: false, error: translateAuthError(e?.message || "Gagal masuk.") };
  }
}

// ---------------------------------------------------------------------------------------
// 4. LOGIN / DAFTAR DENGAN GOOGLE (OAuth lewat Supabase)
// ---------------------------------------------------------------------------------------
function parseParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts = url.split("#");
  const query = [url.split("#")[0].split("?")[1], parts[1]].filter(Boolean).join("&");
  query.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key) params[decodeURIComponent(key)] = decodeURIComponent((value || "").replace(/\+/g, " "));
  });
  return params;
}

export async function loginWithGoogle(): Promise<{
  success: boolean;
  user?: UserProfile;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: NOT_CONFIGURED_ERROR };
  }

  try {
    // Diarahkan ke rute /login yang sudah ada supaya deep link tidak membuka halaman kosong
    const redirectTo = Linking.createURL("login");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      return { success: false, error: translateAuthError(error?.message || "Gagal memulai login Google.") };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) {
      return { success: false, error: "Login Google dibatalkan." };
    }

    const params = parseParams(result.url);
    if (params.error_description || params.error) {
      return { success: false, error: params.error_description || params.error };
    }

    if (params.code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
      if (exchangeError) return { success: false, error: translateAuthError(exchangeError.message) };
    } else if (params.access_token && params.refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (sessionError) return { success: false, error: translateAuthError(sessionError.message) };
    } else {
      return { success: false, error: "Respons login Google tidak lengkap. Coba lagi." };
    }

    const user = await getCurrentUser();
    return user
      ? { success: true, user }
      : { success: false, error: "Sesi Google tidak ditemukan. Coba lagi." };
  } catch (e: any) {
    return { success: false, error: translateAuthError(e?.message || "Gagal login dengan Google.") };
  }
}

// ---------------------------------------------------------------------------------------
// 5. MEMPERBARUI PROFIL PENGGUNA (Ganti Foto, Nama, Status, dll)
// ---------------------------------------------------------------------------------------
export async function updateUserProfile(
  updates: Partial<Omit<UserProfile, "id" | "email" | "createdAt">>
): Promise<UserProfile | null> {
  const current = await getCurrentUser();
  if (!current) return null;

  const merged = { ...current, ...updates };

  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: merged.fullName,
      birth_date: merged.birthDate,
      gender: merged.gender,
      status: merged.status,
      avatar_url: merged.avatarUrl,
    },
  });
  if (error) throw new Error(translateAuthError(error.message));

  return mapUser(data.user);
}

// ---------------------------------------------------------------------------------------
// 6. KELUAR AKUN (LOGOUT)
// ---------------------------------------------------------------------------------------
export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Supabase signOut error:", e);
  }
}
