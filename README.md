# UangKu

Aplikasi manajemen keuangan pribadi (React Native + Expo) dengan **alokasi 3 pilar dinamis**
(Kebutuhan / Keinginan / Tabungan), **rollover jatah harian otomatis**, dan **asisten AI keuangan**.
Seluruh data diakses lewat **RESTful API buatan sendiri** (Node.js + Express + Supabase, Modul 1).

## Arsitektur

```
 Aplikasi Expo  ──(Bearer token)──▶  RESTful API (Express, /backend)  ──▶  Supabase PostgreSQL (RLS)
      │                                    │
      └── Supabase Auth (login/sesi)       └── Gemini (API key hanya di server)
```

```
UangKu/
├── backend/                     # RESTful API (Modul 1)
│   ├── database/schema.sql      # jalankan di Supabase SQL Editor
│   ├── src/
│   │   ├── config/supabaseClient.js
│   │   ├── models/              # akses database  (transaction, category, financialProfile)
│   │   ├── controllers/         # logika HTTP     (+ chat)
│   │   ├── routes/              # pemetaan URL
│   │   ├── middleware/          # auth (verifikasi token), error handler
│   │   ├── services/            # integrasi Gemini
│   │   ├── utils/               # validator & pemetaan error
│   │   └── index.js
│   ├── postman/UangKu_API.postman_collection.json
│   └── vercel.json
└── src/                         # aplikasi mobile
    ├── app/                     # halaman (Expo Router)
    ├── services/
    │   ├── api/                 # client ke RESTful API (transaksi, profil keuangan, kategori, chat)
    │   ├── financeService.ts    # algoritma budgeting + rollover
    │   ├── chatService.ts       # asisten AI & eksekusi aksi
    │   └── authService.ts       # Supabase Auth
    ├── lib/                     # config, date, session, supabase
    └── types/
```

## Kesesuaian dengan ketentuan Tugas Akhir

| # | Ketentuan | Implementasi |
|---|-----------|--------------|
| 1 | API (web service) buatan sendiri sesuai Modul 1 | `backend/`: Express + Supabase, pola model → controller → router. **Satu-satunya jalur data** aplikasi (tidak ada lagi akses langsung ke tabel dari aplikasi). |
| 2 | Bottom Navigation Bar | `src/app/_layout.tsx` (Tabs: Beranda, Chatbot, Profil) |
| 3 | Minimal 5 halaman | 7 halaman: Beranda, Tanya AI, Profil, Riwayat (`more`), Detail, Ubah, Login |
| 4 | Min. 2 halaman utama dengan list → detail | Beranda & Riwayat → `/detail?id=...` (data dari `GET /api/transactions/:id`) |
| 5 | Halaman Profile/About | `src/app/profile.tsx` |
| 6 | Source code di GitHub | lihat bagian "Unggah ke GitHub" |

## Endpoint API

Semua endpoint `/api/*` memerlukan header `Authorization: Bearer <access_token Supabase>`.

| Method | URL | Keterangan |
|--------|-----|------------|
| GET | `/` | Cek server (publik) |
| GET / POST | `/api/transactions` | Daftar (filter `?month=YYYY-MM&type=&from=&to=&limit=`) / tambah |
| GET / PUT / DELETE | `/api/transactions/:id` | Detail / ubah / hapus |
| GET / POST | `/api/categories` | Daftar (bawaan + milik sendiri) / tambah |
| GET / PUT / DELETE | `/api/categories/:id` | Detail / ubah / hapus (milik sendiri) |
| GET / PUT | `/api/financial-profile` | Gaji bulanan + alokasi (total harus 100%) |
| POST | `/api/chat` | Asisten AI (`{ prompt, history, context }`) |

Format error: `{ "error": "pesan" }` dengan status 400 / 401 / 404 / 500.

## Menjalankan

### 1. Database (Supabase)
1. Buka **SQL Editor** > **New query**, tempel isi `backend/database/schema.sql`, klik **RUN**.
   (Skrip ini menghapus tabel `transactions`/`categories` versi lama lalu membuat ulang.)
2. **Authentication > Sign In / Providers**: aktifkan **Allow anonymous sign-ins**
   (dipakai untuk tombol "Nanti Saja"). Untuk memudahkan uji coba, nonaktifkan juga
   **Confirm email** pada provider Email.
3. (Opsional) Login Google: aktifkan provider Google, lalu tambahkan URL redirect aplikasi pada
   **Authentication > URL Configuration > Redirect URLs** (`uangku://login` dan, untuk Expo Go,
   `exp://**`).

### 2. Backend
```bash
cd backend
cp .env.example .env      # isi SUPABASE_URL, SUPABASE_KEY, (opsional) GEMINI_API_KEY
npm install
npm run dev               # http://localhost:3000
```

### 3. Aplikasi
```bash
cp .env.example .env      # isi EXPO_PUBLIC_SUPABASE_URL & EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start -c
```
`EXPO_PUBLIC_API_URL` dikosongkan untuk emulator Android / iOS simulator / web.
Untuk **HP asli** isi dengan `http://IP-LAPTOP:3000` (satu Wi-Fi) atau URL Vercel.

### 4. Deploy API ke Vercel (Percobaan 2 Modul 1)
1. Push repo ke GitHub, lalu di Vercel: **Add New > Project > Import**.
2. **Root Directory: `backend`**.
3. Environment Variables: `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`.
4. Deploy, lalu isi `EXPO_PUBLIC_API_URL` di `.env` aplikasi dengan URL yang diberikan Vercel.

Uji dengan Postman: impor `backend/postman/UangKu_API.postman_collection.json`, isi variabel
`baseUrl` dan `token` (access token dapat dilihat dari login Supabase).

## Unggah ke GitHub
```bash
git init
git add .
git status                # pastikan .env TIDAK ada di daftar
git commit -m "feat: UangKu"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```
`.env` sudah masuk `.gitignore`. Jangan pernah meng-commit key; jika pernah ter-commit, ganti key-nya.

## Algoritma budgeting

```
spendableRatio  = (needs + wants) / 100
baseSpendable   = monthlyIncome × spendableRatio
todayAllowance  = max(0, baseSpendable − pastDaysNetSpend) / sisaHariBulanIni
todayAvailable  = todayAllowance + (pemasukanHariIni × spendableRatio) − pengeluaranHariIni   (boleh minus)
```
Sisa hemat hari ini otomatis menambah jatah hari berikutnya (rollover); kelebihan belanja membuat
jatah minus (merah) dan langsung memotong sisa uang bulanan.
