-- Musteri Karti: cari hesabi olan musterileri kayit altina alan modul.
-- islemler tablosuna musteri_id eklenerek, bir isleme opsiyonel olarak bir
-- musteri baglanabiliyor - boylece o musteriyle ilgili gelir/gider tek yerden
-- (net bakiye seklinde) goruntulenebiliyor.

create table if not exists public.musteriler (
  id uuid primary key default gen_random_uuid(),
  ad_soyad text not null,
  telefon text,
  adres text,
  notlar text,
  olusturan uuid references public.profiller(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger musteriler_set_updated_at
  before update on public.musteriler
  for each row execute function public.set_updated_at();

alter table public.islemler add column if not exists musteri_id uuid references public.musteriler(id) on delete set null;
create index if not exists islemler_musteri_id_idx on public.islemler (musteri_id);

alter table public.musteriler enable row level security;

create policy "Giris yapan musterileri okuyabilir" on public.musteriler
  for select using (auth.uid() is not null);

create policy "Izleyici disindaki musteri ekleyebilir" on public.musteriler
  for insert with check (
    auth.uid() is not null
    and exists (select 1 from public.profiller where id = auth.uid() and rol <> 'izleyici')
  );

create policy "Izleyici disindaki musteriyi guncelleyebilir" on public.musteriler
  for update using (
    auth.uid() is not null
    and exists (select 1 from public.profiller where id = auth.uid() and rol <> 'izleyici')
  );

create policy "Izleyici disindaki musteriyi silebilir" on public.musteriler
  for delete using (
    auth.uid() is not null
    and exists (select 1 from public.profiller where id = auth.uid() and rol <> 'izleyici')
  );
