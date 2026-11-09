-- TEK SEFERLİK (migration değil): canlıya ilk yüklemeden önce deneme turu kayıtlarının
-- temizlenmesi — 9 Kasım 2026, kullanıcı onayıyla.
--
-- O ana kadar veritabanındaki bütün iş kayıtları kullanıcının "DENEME" önekli deneme
-- turuna aitti (2 cari, 3 stok kartı, DENEME Banka, 1 alış, 2 satış, 1 parti, 7 fiş).
-- Silinmeyenler: Merkez Kasa (100.01) ve sistem hesapları, Temmuz'dan kalan notlar ve
-- hatırlatıcılar, profiller, ayarlar.
-- Yedek: yedek/2026-11-09_deneme-turu-oncesi-temizlik.json (git dışı).
--
-- Fiş/hareket tabloları silmeyi tetikleyicilerle engellediği için tetikleyiciler bu
-- işlem süresince kapatılır. Numara sayaçları sıfırlanır: ilk gerçek satış SAT-1 olur.

begin;

alter table public.yevmiye_fisleri disable trigger user;
alter table public.yevmiye_satirlari disable trigger user;
alter table public.stok_hareketleri disable trigger user;
alter table public.alis_kalemleri disable trigger user;
alter table public.satis_kalemleri disable trigger user;
alter table public.sayim_kalemleri disable trigger user;
alter table public.parti_girdileri disable trigger user;
alter table public.uretim_partileri disable trigger user;
alter table public.alis_faturalari disable trigger user;
alter table public.satis_faturalari disable trigger user;
alter table public.para_hareketleri disable trigger user;
alter table public.sayimlar disable trigger user;
alter table public.receteler disable trigger user;
alter table public.recete_kalemleri disable trigger user;
alter table public.kasa_banka_hesaplari disable trigger user;
alter table public.stok_kartlari disable trigger user;
alter table public.cariler disable trigger user;
alter table public.hesap_plani disable trigger user;

delete from public.parti_girdileri;
delete from public.uretim_partileri;
delete from public.recete_kalemleri;
delete from public.receteler;
delete from public.sayim_kalemleri;
delete from public.sayimlar;
delete from public.para_hareketleri;
delete from public.alis_kalemleri;
delete from public.alis_faturalari;
delete from public.satis_kalemleri;
delete from public.satis_faturalari;
delete from public.stok_hareketleri;
delete from public.yevmiye_satirlari;
delete from public.yevmiye_fisleri;
delete from public.kasa_banka_hesaplari where kod <> '100.01';
delete from public.stok_kartlari;
delete from public.cariler;
delete from public.hesap_plani where not sistem;
delete from public.degisiklik_kaydi;

alter table public.yevmiye_fisleri enable trigger user;
alter table public.yevmiye_satirlari enable trigger user;
alter table public.stok_hareketleri enable trigger user;
alter table public.alis_kalemleri enable trigger user;
alter table public.satis_kalemleri enable trigger user;
alter table public.sayim_kalemleri enable trigger user;
alter table public.parti_girdileri enable trigger user;
alter table public.uretim_partileri enable trigger user;
alter table public.alis_faturalari enable trigger user;
alter table public.satis_faturalari enable trigger user;
alter table public.para_hareketleri enable trigger user;
alter table public.sayimlar enable trigger user;
alter table public.receteler enable trigger user;
alter table public.recete_kalemleri enable trigger user;
alter table public.kasa_banka_hesaplari enable trigger user;
alter table public.stok_kartlari enable trigger user;
alter table public.cariler enable trigger user;
alter table public.hesap_plani enable trigger user;

alter table public.yevmiye_fisleri alter column fis_no restart with 1;
alter table public.satis_faturalari alter column satis_no restart with 1;
alter table public.uretim_partileri alter column parti_no restart with 1;
alter table public.sayimlar alter column sayim_no restart with 1;

select 'kalan' as durum,
  (select count(*) from public.cariler) cari, (select count(*) from public.stok_kartlari) stok_karti,
  (select string_agg(ad, ',') from public.kasa_banka_hesaplari) kasa_banka,
  (select count(*) from public.hesap_plani) hesap, (select count(*) from public.hesap_plani where not sistem) alt_hesap,
  (select count(*) from public.yevmiye_fisleri) fis, (select count(*) from public.stok_hareketleri) hareket,
  (select count(*) from public.degisiklik_kaydi) log, (select count(*) from public.notlar) not_sayisi,
  (select count(*) from public.hatirlaticilar) hatirlatici, (select count(*) from public.profiller) profil,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where not t.tgisinternal and t.tgenabled = 'D') kapali_tetikleyici;

commit;
