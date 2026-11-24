import Fontisto from "@expo/vector-icons/Fontisto";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { ensureSession } from "../lib/session";

/**
 * ======================================================================================
 * ROOT LAYOUT (BOTTOM NAVIGATION BAR / TABS)
 * ======================================================================================
 * Struktur navigasi bersih standar Expo Router:
 * 1. index.tsx   -> Tab Utama (Dashboard Saldo & Transaksi)
 * 2. ask.tsx     -> Tab Tanya AI (Chat Bot Keuangan)
 * 3. profile.tsx -> Tab Profil (Preferensi & Info Aplikasi)
 * ======================================================================================
 */
export default function RootLayout() {
  const router = useRouter();

  // Semua data diakses lewat RESTful API yang membutuhkan sesi.
  // Jika belum ada sesi, dibuatkan sesi tamu; bila gagal (mis. sesi tamu dinonaktifkan di
  // Supabase) pengguna diarahkan ke halaman login.
  useEffect(() => {
    let active = true;
    ensureSession().then((ok) => {
      if (active && !ok) router.replace("/login" as any);
    });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        // PENGATURAN NAVBAR BAWAH (TAB BAR STYLE)
        tabBarStyle: {
          backgroundColor: "#6400deff",
          borderTopWidth: 1,
          borderTopColor: "#ad3bffff",
          height: 60,
          paddingBottom: 4,
          paddingTop: 8,
        },

        // PEMISAH ANTAR TAB
        tabBarItemStyle: {
          borderRightWidth: 1,
          borderRightColor: "#000000ff",
        },

        // WARNA ICON AKTIF / TIDAK AKTIF
        tabBarActiveTintColor: "#00f7ffff",
        tabBarInactiveTintColor: "#ffffff",
        headerTitleAlign: "center",
      }}
    >
      {/* 1. TAB HOME (DASHBOARD UTAMA) */}
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Fontisto name="home" size={24} color={color as string} />
          ),
        }}
      />

      {/* 2. TAB ASK (CHAT BOT AI) */}
      <Tabs.Screen
        name="ask"
        options={{
          headerShown: true,
          headerTitle: "Chat Bot AI",
          headerStyle: {
            backgroundColor: "#6400de",
          },
          headerTintColor: "#ffffff",
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          tabBarIcon: ({ color }) => (
            <Fontisto name="comment" size={24} color={color as string} />
          ),
        }}
      />

      {/* 3. TAB PROFILE (PENGATURAN & INFO) */}
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: true,
          headerTitle: "Profil & Pengaturan",
          headerStyle: {
            backgroundColor: "#6400de",
          },
          headerTintColor: "#ffffff",
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          tabBarItemStyle: {
            borderRightWidth: 0,
          },
          tabBarIcon: ({ color }) => (
            <Fontisto name="person" size={24} color={color as string} />
          ),
        }}
      />

      {/* 4. HALAMAN MORE (RIWAYAT LENGKAP 2 BULAN) */}
      <Tabs.Screen
        name="more"
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
          tabBarItemStyle: { display: "none" },
          headerShown: false,
        }}
      />

      {/* 5. HALAMAN LOGIN & DAFTAR AKUN */}
      <Tabs.Screen
        name="login"
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
          tabBarItemStyle: { display: "none" },
          headerShown: false,
        }}
      />

      {/* 6. HALAMAN DETAIL TRANSAKSI (SYARAT POIN 4 TUGAS AKHIR) */}
      <Tabs.Screen
        name="detail"
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
          tabBarItemStyle: { display: "none" },
          headerShown: false,
        }}
      />

      {/* 7. HALAMAN UBAH TRANSAKSI (SYARAT POIN 4 TUGAS AKHIR) */}
      <Tabs.Screen
        name="edit"
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
          tabBarItemStyle: { display: "none" },
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
