-- Açılış tarihi + karşı hesap ayarını da ön muhasebe girebilsin (kullanıcı kararı, 11 Kas 2026:
-- "Nagihan girebilsin"). Önceki kural yalnız yönetici (20261111180000'de bilerek ayrı bırakılmıştı).
-- Açılış bakiyesi girme yetkisiyle aynı kural: islem_izni('acilis') = yönetici + ön muhasebe.

drop policy if exists "Yonetici duzenler" on public.acilis_ayarlari;
create policy "Acilis yetkilisi duzenler" on public.acilis_ayarlari
  for update using (public.islem_izni('acilis')) with check (public.islem_izni('acilis'));
