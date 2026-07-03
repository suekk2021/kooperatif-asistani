-- Sistem ayarlari - tek satirlik singleton tablo (OCR saglayici secimi + API anahtarlari).
-- Anahtarlar client'a asla ham olarak donmez, sadece server action'lar icinde okunur.
create table public.ayarlar (
  id boolean primary key default true check (id),
  ocr_saglayici text not null default 'gemini' check (ocr_saglayici in ('gemini', 'openai')),
  gemini_api_key text,
  openai_api_key text,
  updated_at timestamptz not null default now()
);

insert into public.ayarlar (id) values (true);

alter table public.ayarlar enable row level security;

-- Herkes (giris yapan) okuyabilir - ama sadece server action'lar ham anahtari kullanir,
-- client tarafina hicbir zaman ham deger gonderilmez (bkz. actions/ayarlar.ts).
create policy "Giris yapan ayarlari okuyabilir" on public.ayarlar
  for select using (auth.uid() is not null);

-- Sadece Baskan rolu guncelleyebilir.
create policy "Sadece baskan ayarlari guncelleyebilir" on public.ayarlar
  for update using (
    exists (select 1 from public.profiller where id = auth.uid() and rol = 'baskan')
  );

create trigger ayarlar_set_updated_at
  before update on public.ayarlar
  for each row execute function public.set_updated_at();
