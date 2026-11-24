-- ==============================================================================
-- SKEMA DATABASE UANGKU (Supabase / PostgreSQL)
-- ==============================================================================
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > tempel seluruh isi
-- file ini > RUN. Aman dijalankan ulang.
--
-- PERHATIAN: bagian 1 MENGHAPUS tabel lama (transactions, categories) beserta
-- isinya, karena strukturnya berbeda (sekarang data terikat ke akun pengguna).
-- ==============================================================================

-- 1. HAPUS TABEL VERSI LAMA ----------------------------------------------------
drop table if exists transactions cascade;
drop table if exists categories cascade;
drop table if exists financial_profiles cascade;

-- 2. TABEL ---------------------------------------------------------------------

-- Kategori. user_id NULL = kategori bawaan (bisa dibaca semua pengguna).
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'expense' check (type in ('income', 'expense')),
  icon text,
  created_at timestamptz not null default now()
);

-- Transaksi milik pengguna.
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  amount numeric(15, 2) not null default 0 check (amount >= 0),
  type text not null default 'expense' check (type in ('income', 'expense')),
  category text not null default 'Lainnya',
  wallet text not null default 'Tunai',
  date date not null default ((now() at time zone 'Asia/Jakarta')::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_date_idx on transactions (user_id, date desc);

-- Profil keuangan: gaji bulanan + alokasi Kebutuhan / Keinginan / Tabungan (1 baris per pengguna).
create table financial_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  monthly_income numeric(15, 2) not null default 0 check (monthly_income >= 0),
  needs_pct integer not null default 50 check (needs_pct between 0 and 100),
  wants_pct integer not null default 30 check (wants_pct between 0 and 100),
  savings_pct integer not null default 20 check (savings_pct between 0 and 100),
  updated_at timestamptz not null default now(),
  constraint allocation_total_100 check (needs_pct + wants_pct + savings_pct = 100)
);

-- 3. TRIGGER updated_at ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transactions_set_updated_at
  before update on transactions
  for each row execute function set_updated_at();

create trigger financial_profiles_set_updated_at
  before update on financial_profiles
  for each row execute function set_updated_at();

-- 4. ROW LEVEL SECURITY ---------------------------------------------------------
-- Setiap pengguna hanya bisa melihat dan mengubah datanya sendiri.
alter table categories enable row level security;
alter table transactions enable row level security;
alter table financial_profiles enable row level security;

grant select, insert, update, delete on categories, transactions, financial_profiles to authenticated;

create policy "categories: baca bawaan + milik sendiri" on categories
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "categories: tambah milik sendiri" on categories
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "categories: ubah milik sendiri" on categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categories: hapus milik sendiri" on categories
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "transactions: akses milik sendiri" on transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "financial_profiles: akses milik sendiri" on financial_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 5. DATA AWAL KATEGORI BAWAAN --------------------------------------------------
insert into categories (name, type, icon)
values
  ('Makanan', 'expense', 'coffeescript'),
  ('Transportasi', 'expense', 'car'),
  ('Belanja', 'expense', 'shopping-bag'),
  ('Hiburan', 'expense', 'film'),
  ('Tagihan', 'expense', 'wallet'),
  ('Lainnya', 'expense', 'nav-icon-grid'),
  ('Gaji', 'income', 'money-symbol'),
  ('Pemasukan', 'income', 'money-symbol'),
  ('Investasi', 'income', 'line-chart');
