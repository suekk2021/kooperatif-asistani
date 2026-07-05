-- Not -> Telegram uyarisi ozelligi icin altyapi:
-- 1) Her kullanicinin kendi kisisel Telegram chat id'sini tutabilmesi (Baskan yonetir).
-- 2) Bir notun belirli bir kullaniciya yonelik olabilmesi (hedef_kullanici_id).
-- 3) profiller tablosunda hic UPDATE politikasi yoktu - bu yuzden Kullanicilar
--    Yonetimi'ndeki rol degistirme ozelligi de sessizce calismiyordu, bu da duzeltildi.

alter table public.profiller add column if not exists telegram_chat_id text;
alter table public.notlar add column if not exists hedef_kullanici_id uuid references public.profiller(id) on delete set null;

create policy "Sadece baskan profil guncelleyebilir" on public.profiller
  for update using (
    exists (select 1 from public.profiller p2 where p2.id = auth.uid() and p2.rol = 'baskan')
  );
