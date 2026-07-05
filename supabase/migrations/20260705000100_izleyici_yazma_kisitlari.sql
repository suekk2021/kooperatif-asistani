-- Izleyici rolundeki kullanicilarin islemler/hatirlaticilar/notlar tablolarina
-- yazma (ekleme/duzenleme/silme) yapamamasi icin mevcut politikalar
-- guncellendi. Okuma (SELECT) politikalari degismedi.

drop policy "Giris yapan islem ekleyebilir" on public.islemler;
create policy "Giris yapan islem ekleyebilir" on public.islemler
  for insert with check (
    auth.uid() is not null
    and olusturan = auth.uid()
    and exists (select 1 from profiller where id = auth.uid() and rol <> 'izleyici')
  );

drop policy "Giris yapan kendi islemini duzenleyebilir" on public.islemler;
create policy "Giris yapan kendi islemini duzenleyebilir" on public.islemler
  for update using (
    auth.uid() is not null
    and exists (select 1 from profiller where id = auth.uid() and rol <> 'izleyici')
  );

drop policy "Giris yapan islemi silebilir" on public.islemler;
create policy "Giris yapan islemi silebilir" on public.islemler
  for delete using (
    auth.uid() is not null
    and exists (select 1 from profiller where id = auth.uid() and rol <> 'izleyici')
  );

drop policy "Giris yapan hatirlatici ekleyebilir" on public.hatirlaticilar;
create policy "Giris yapan hatirlatici ekleyebilir" on public.hatirlaticilar
  for insert with check (
    auth.uid() is not null
    and olusturan = auth.uid()
    and exists (select 1 from profiller where id = auth.uid() and rol <> 'izleyici')
  );

drop policy "Giris yapan hatirlaticiyi guncelleyebilir" on public.hatirlaticilar;
create policy "Giris yapan hatirlaticiyi guncelleyebilir" on public.hatirlaticilar
  for update using (
    auth.uid() is not null
    and exists (select 1 from profiller where id = auth.uid() and rol <> 'izleyici')
  );

drop policy "Giris yapan hatirlaticiyi silebilir" on public.hatirlaticilar;
create policy "Giris yapan hatirlaticiyi silebilir" on public.hatirlaticilar
  for delete using (
    auth.uid() is not null
    and exists (select 1 from profiller where id = auth.uid() and rol <> 'izleyici')
  );

drop policy "Giris yapan not ekleyebilir" on public.notlar;
create policy "Giris yapan not ekleyebilir" on public.notlar
  for insert with check (
    auth.uid() is not null
    and exists (select 1 from profiller where id = auth.uid() and rol <> 'izleyici')
  );

drop policy "Giris yapan notu guncelleyebilir" on public.notlar;
create policy "Giris yapan notu guncelleyebilir" on public.notlar
  for update using (
    auth.uid() is not null
    and exists (select 1 from profiller where id = auth.uid() and rol <> 'izleyici')
  );

drop policy "Giris yapan notu silebilir" on public.notlar;
create policy "Giris yapan notu silebilir" on public.notlar
  for delete using (
    auth.uid() is not null
    and exists (select 1 from profiller where id = auth.uid() and rol <> 'izleyici')
  );
