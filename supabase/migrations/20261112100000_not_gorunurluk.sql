-- Notlar yalnız gönderene ve alıcılarına görünür. Alıcısı olmayan (genel) not giriş yapan herkese görünür.
-- Başkan/Operasyon yöneticisi ve teknik destek de başkasının kişiye özel notunu görmez (kullanıcı kararı, 12 Kas).
-- Not yazılırken seçilen "Herkes" ekranda tek tek kişilere çevrilip kaydedildiği için o not da seçilenlerin hepsine görünür.

drop policy if exists "Giris yapan notlari okuyabilir" on public.notlar;
create policy "Ilgili kisiler notu okuyabilir" on public.notlar
  for select using (
    auth.uid() is not null
    and (
      (hedef_kullanici_id is null and cardinality(hedef_kullanici_idler) = 0)
      or olusturan = auth.uid()
      or hedef_kullanici_id = auth.uid()
      or auth.uid() = any (hedef_kullanici_idler)
    )
  );

-- Nota eklenen fotoğraf/video/dosya: notu görebilen kişi dosyasını da görür (alt sorgu notlar kuralından geçer).
drop policy if exists "Giris yapan not medyasini gorebilir" on storage.objects;
create policy "Notu gorebilen medyasini gorebilir" on storage.objects
  for select using (
    bucket_id = 'not-medya'
    and exists (select 1 from public.notlar n where n.medya_yol = storage.objects.name)
  );
