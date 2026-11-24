# UangKu API (Modul 1 PPB)

RESTful API Node.js + Express + Supabase dengan struktur model, controller, dan router.

```bash
npm install
cp .env.example .env     # SUPABASE_URL, SUPABASE_KEY (anon public key), GEMINI_API_KEY (opsional)
npm run dev              # http://localhost:3000
```

- Skema database: `database/schema.sql` (jalankan di Supabase SQL Editor).
- Semua `/api/*` butuh `Authorization: Bearer <access_token>`; token diverifikasi ke Supabase Auth
  dan query dijalankan atas nama pengguna sehingga Row Level Security membatasi data per akun.
- Postman: `postman/UangKu_API.postman_collection.json` (isi variabel `baseUrl` dan `token`).
- Deploy: Vercel, Root Directory `backend`, isi environment variable yang sama dengan `.env`.

Daftar endpoint lengkap ada di README di root proyek.
