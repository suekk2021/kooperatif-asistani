-- Roller genişletildi (9 Kas 2026, Canan Hanım ile görüşme):
--   baskan      Canan Hanım — temsil; her şey + kişi ekleme
--   operasyon   Fatih Bey (ortak şirketin genel müdürü) — üretim/finans takibi; her şey + kişi ekleme
--   on_muhasebe Nagihan Hanım — kayıt girer
--   depo        ileride depo/üretim görevlisi — kayıt girer
--   muhasebeci  ortak şirketin muhasebecisi/mali müşavir — her şeyi görür, kayıt giremez
--   izleyici    sadece görür
-- Yeni enum değerleri aynı işlemde kullanılamadığı için fonksiyonlar rol::text ile karşılaştırır.

alter type public.kullanici_rolu add value if not exists 'operasyon';
alter type public.kullanici_rolu add value if not exists 'depo';
alter type public.kullanici_rolu add value if not exists 'muhasebeci';

-- Ekranda adın yanında görünen serbest görev yazısı ("Genel Müdür · ortak şirket").
alter table public.profiller add column if not exists gorev text;

create or replace function public.yonetici_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol::text in ('baskan', 'operasyon'));
$$;

-- Eski ad korunuyor (hesap planı, KDV, depo, dönem kapatma kuralları bunu kullanıyor);
-- artık "yönetici mi" anlamına geliyor: başkan veya operasyon yöneticisi.
create or replace function public.baskan_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select public.yonetici_mi();
$$;

create or replace function public.yazabilir()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol::text not in ('izleyici', 'muhasebeci'));
$$;

-- Bu iki kural daha önce panelden elle eklenmişti (migration'da yoktu); dosyaya alındı.
drop policy if exists "Sadece baskan profil guncelleyebilir" on public.profiller;
create policy "Yonetici profil gunceller" on public.profiller for update using (public.yonetici_mi());

drop policy if exists "Sadece baskan ayarlari guncelleyebilir" on public.ayarlar;
create policy "Yonetici ayarlari gunceller" on public.ayarlar for update using (public.yonetici_mi());

-- Eski tablolarda (notlar, hatırlatıcılar) yazma kuralı "rol <> izleyici" idi; muhasebeci de
-- sadece okusun diye yazabilir()'e bağlandı.
drop policy if exists "Giris yapan hatirlatici ekleyebilir" on public.hatirlaticilar;
create policy "Giris yapan hatirlatici ekleyebilir" on public.hatirlaticilar
  for insert with check (olusturan = auth.uid() and public.yazabilir());
drop policy if exists "Giris yapan hatirlaticiyi guncelleyebilir" on public.hatirlaticilar;
create policy "Giris yapan hatirlaticiyi guncelleyebilir" on public.hatirlaticilar for update using (public.yazabilir());
drop policy if exists "Giris yapan hatirlaticiyi silebilir" on public.hatirlaticilar;
create policy "Giris yapan hatirlaticiyi silebilir" on public.hatirlaticilar for delete using (public.yazabilir());
drop policy if exists "Giris yapan not ekleyebilir" on public.notlar;
create policy "Giris yapan not ekleyebilir" on public.notlar for insert with check (public.yazabilir());
drop policy if exists "Giris yapan notu guncelleyebilir" on public.notlar;
create policy "Giris yapan notu guncelleyebilir" on public.notlar for update using (public.yazabilir());
drop policy if exists "Giris yapan notu silebilir" on public.notlar;
create policy "Giris yapan notu silebilir" on public.notlar for delete using (public.yazabilir());
