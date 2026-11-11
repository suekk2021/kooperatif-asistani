-- Bilgi işlem rolü (11 Kas 2026): programı kuran/bakımını yapan kişi, kooperatifte normal bir çalışan gibi
-- (adıyla, her listede görünür) ve tam yetkili olarak çalışabilsin. Yetki olarak yönetici + teknik destek gibidir;
-- "Teknik destek" rolünden farkı operasyonda GİZLİ olmamasıdır.
--
-- Yeni enum değeri aynı işlemde kullanılamadığı için fonksiyon rol::text ile karşılaştırır; hesabın rolü
-- bu migration'dan sonra ayrıca atanır.

alter type public.kullanici_rolu add value if not exists 'bilgi_islem';

create or replace function public.yonetici_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol::text in ('baskan', 'operasyon', 'destek', 'bilgi_islem'));
$$;
