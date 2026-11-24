import { Platform } from "react-native";

/**
 * Alamat server RESTful API UangKu (folder /backend).
 *
 * Isi EXPO_PUBLIC_API_URL di file .env dengan URL server, contoh:
 *   - Setelah deploy ke Vercel : https://uangku-api.vercel.app
 *   - Lokal di HP asli (Expo Go): http://192.168.x.x:3000  (IP laptop, satu Wi-Fi)
 * Jika dikosongkan, dipakai alamat default untuk emulator/simulator/web.
 */
const rawUrl = (process.env.EXPO_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const defaultUrl =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export const API_ORIGIN = rawUrl || defaultUrl;
export const API_BASE_URL = `${API_ORIGIN}/api`;
