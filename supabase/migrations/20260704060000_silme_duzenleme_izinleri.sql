-- islemler, hatirlaticilar ve notlar tablolarinda DELETE icin RLS policy hic
-- tanimlanmamisti - bu yuzden "Sil" butonu hata vermeden hicbir seyi silmiyordu
-- (RLS bir satiri eslemedigi zaman hata degil, 0 etkilenen satir dondurur).
-- notlar tablosunda ayrica UPDATE policy'si de eksikti.

create policy "Giris yapan islemi silebilir" on public.islemler
  for delete using (auth.uid() is not null);

create policy "Giris yapan hatirlaticiyi silebilir" on public.hatirlaticilar
  for delete using (auth.uid() is not null);

create policy "Giris yapan notu guncelleyebilir" on public.notlar
  for update using (auth.uid() is not null);

create policy "Giris yapan notu silebilir" on public.notlar
  for delete using (auth.uid() is not null);
