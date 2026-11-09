-- Teknik destek rolü (9 Kas 2026): programı geliştiren/bakımını yapan kişi sistemde
-- hataları yerinde görebilsin diye. Yetki olarak yöneticiyle aynıdır (her şeyi görür,
-- girer, kurulumda kişi açar); ama operasyonda "ayak altında" değildir: kişi seçme
-- listelerinde, @ çağırmada ve bildirimlerde yer almaz.
-- Gizli DEĞİLDİR: Ayarlar → Kişiler ekranında "Teknik destek" etiketiyle görünür,
-- yaptığı her değişiklik değişiklik kaydına düşer; başkan/operasyon bu hesabı silebilir.

alter type public.kullanici_rolu add value if not exists 'destek';

create or replace function public.yonetici_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol::text in ('baskan', 'operasyon', 'destek'));
$$;
