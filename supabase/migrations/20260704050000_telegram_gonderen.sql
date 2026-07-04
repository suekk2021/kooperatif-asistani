-- Telegram uzerinden (webhook ile) olusturulan kayitlarin hangi kisi tarafindan
-- gonderildigini gosterebilmek icin (chat id'ye Ayarlar'dan verilen etiket, ya da
-- etiket yoksa ham chat id). Web arayuzunden olusturulan kayitlarda bos kalir,
-- o durumda zaten "olusturan" (profiller.id) alani kullaniciyi gosterir.
alter table public.islemler add column if not exists telegram_gonderen text;
alter table public.hatirlaticilar add column if not exists telegram_gonderen text;
alter table public.notlar add column if not exists telegram_gonderen text;
