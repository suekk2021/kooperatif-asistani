-- Notlar ve hatirlaticilar artik birden fazla kisiye yonelik olabilir (kisi + rol grubu secimi
-- ekranda kisilere cevrilip burada kisi listesi olarak saklanir). Eski tek-kisi kolonu
-- (hedef_kullanici_id) eski kod ve eski kayitlar icin yerinde kalir.
-- Yetki kurallari (RLS) tablo bazli oldugu icin yeni kolon icin ayri politika gerekmez.

alter table public.notlar add column if not exists hedef_kullanici_idler uuid[] not null default '{}';
alter table public.hatirlaticilar add column if not exists hedef_kullanici_idler uuid[] not null default '{}';

update public.notlar
   set hedef_kullanici_idler = array[hedef_kullanici_id]
 where hedef_kullanici_id is not null and hedef_kullanici_idler = '{}';

update public.hatirlaticilar
   set hedef_kullanici_idler = array[hedef_kullanici_id]
 where hedef_kullanici_id is not null and hedef_kullanici_idler = '{}';
