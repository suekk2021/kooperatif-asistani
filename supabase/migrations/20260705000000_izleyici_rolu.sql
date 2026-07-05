-- Uclunu rol: Izleyici. Sadece goruntuleme/takip yetkisi olan, kayit
-- ekleyip/duzenleyip/silemeyen bir rol. Mevcut SELECT politikalari zaten
-- "giris yapan herkes okuyabilir" oldugu icin degismiyor - sadece
-- INSERT/UPDATE/DELETE politikalari izleyici'yi disarida birakacak sekilde
-- guncellendi.

alter type public.kullanici_rolu add value if not exists 'izleyici';
