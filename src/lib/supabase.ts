import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Klien Supabase di aplikasi HANYA dipakai untuk autentikasi (login, daftar, sesi/token).
 * Seluruh data keuangan diakses lewat RESTful API sendiri (lihat src/services/api).
 */
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = (): boolean =>
  Boolean(supabaseUrl.startsWith("https://") && supabaseAnonKey.length > 20);

export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : "https://placeholder.supabase.co",
  isSupabaseConfigured() ? supabaseAnonKey : "placeholder-key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
