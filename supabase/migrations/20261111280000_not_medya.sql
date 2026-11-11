-- Notlara fotoğraf / video / dosya eki (Telegram'dan gelen medya not olarak kaydedilir).
-- medya_dosya_id: Telegram'ın dosya numarası (kişilere yeniden iletmek için; indirme gerekmez).
-- medya_yol: Supabase Storage'a kaydedilen kopya (web'de göstermek için). Telegram botları en fazla
-- 20 MB indirebildiği için daha büyük dosyalarda boş kalır; dosya yine Telegram'dan iletilir.

alter table public.notlar
  add column if not exists medya_tur text check (medya_tur in ('foto', 'video', 'video_notu', 'animasyon', 'belge')),
  add column if not exists medya_yol text,
  add column if not exists medya_dosya_id text,
  add column if not exists medya_adi text,
  add column if not exists medya_boyut bigint;

-- Özel depolama alanı: yalnız giriş yapanlar görebilir (notları zaten giriş yapan herkes görüyor).
-- Dosyayı sunucu (service role) yazar ve siler; tarayıcıdan yazma izni verilmez.
insert into storage.buckets (id, name, public, file_size_limit)
values ('not-medya', 'not-medya', false, 20971520)
on conflict (id) do nothing;

create policy "Giris yapan not medyasini gorebilir" on storage.objects
  for select using (bucket_id = 'not-medya' and auth.uid() is not null);
