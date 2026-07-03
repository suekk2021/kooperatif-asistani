-- On Muhasebe - Asama A semasi (Modul 1,2,3,5: fis girisi, gelir/gider, hatirlatici, dashboard)
-- Modul 4 (muhasebeci raporu) formata bagli oldugu icin bu semaya dahil edilmedi.

-- Roller: baskan (her seyi gorur) / on_muhasebe (fis girer, kayit duzenler)
create type public.kullanici_rolu as enum ('baskan', 'on_muhasebe');

-- auth.users tablosuna baglanan profil - Supabase Auth kullaniciyi yonetir, rol burada tutulur
create table public.profiller (
  id uuid primary key references auth.users(id) on delete cascade,
  ad_soyad text not null,
  rol public.kullanici_rolu not null default 'on_muhasebe',
  created_at timestamptz not null default now()
);

-- Gelir/Gider kayitlari (fis/fatura girisi bu tabloya duser)
create type public.islem_turu as enum ('gelir', 'gider');

create table public.islemler (
  id uuid primary key default gen_random_uuid(),
  tur public.islem_turu not null,
  tutar numeric(12, 2) not null check (tutar > 0),
  tarih date not null default current_date,
  aciklama text not null,
  kategori text,
  fis_gorsel_url text,          -- Vercel Blob / Supabase Storage url'i
  ocr_ham_metin text,           -- OCR'in okudugu ham metin, denetim icin saklanir
  olusturan uuid not null references public.profiller(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index islemler_tarih_idx on public.islemler (tarih desc);
create index islemler_tur_idx on public.islemler (tur);

-- Tarihli hatirlaticilar (Telegram bildirimi bunlardan tetiklenir)
create table public.hatirlaticilar (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  hatirlatma_tarihi date not null,
  tamamlandi boolean not null default false,
  telegram_gonderildi boolean not null default false,
  olusturan uuid not null references public.profiller(id),
  created_at timestamptz not null default now()
);

create index hatirlaticilar_tarih_idx on public.hatirlaticilar (hatirlatma_tarihi) where not tamamlandi;

-- updated_at otomatik guncelleme
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger islemler_set_updated_at
  before update on public.islemler
  for each row execute function public.set_updated_at();

-- Row Level Security: sadece giris yapmis (profili olan) kullanicilar okuyup yazabilir.
-- Kooperatifin ic uygulamasi oldugu icin herkes birbirinin kaydini gorebilir (ayri musteri izolasyonu yok).
alter table public.profiller enable row level security;
alter table public.islemler enable row level security;
alter table public.hatirlaticilar enable row level security;

create policy "Profilini gorebilir" on public.profiller
  for select using (auth.uid() is not null);

create policy "Giris yapan islem okuyabilir" on public.islemler
  for select using (auth.uid() is not null);

create policy "Giris yapan islem ekleyebilir" on public.islemler
  for insert with check (auth.uid() is not null and olusturan = auth.uid());

create policy "Giris yapan kendi islemini duzenleyebilir" on public.islemler
  for update using (auth.uid() is not null);

create policy "Giris yapan hatirlatici okuyabilir" on public.hatirlaticilar
  for select using (auth.uid() is not null);

create policy "Giris yapan hatirlatici ekleyebilir" on public.hatirlaticilar
  for insert with check (auth.uid() is not null and olusturan = auth.uid());

create policy "Giris yapan hatirlaticiyi guncelleyebilir" on public.hatirlaticilar
  for update using (auth.uid() is not null);

-- Yeni kullanici auth.users'a eklendiginde otomatik profil olustur (varsayilan rol: on_muhasebe)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiller (id, ad_soyad, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'ad_soyad', new.email), 'on_muhasebe');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
