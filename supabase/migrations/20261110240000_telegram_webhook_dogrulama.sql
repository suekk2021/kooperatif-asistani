-- Güvenlik taraması (9 Kas 2026): Telegram webhook'una gelen isteğin gerçekten Telegram'dan
-- geldiği doğrulanmıyordu; izinli bir chat id'yi bilen biri sahte istekle not/hatırlatıcı
-- ekletebilirdi. Telegram setWebhook'a verilen secret_token her istekte
-- X-Telegram-Bot-Api-Secret-Token başlığıyla geri gelir; webhook bu değeri burada
-- saklanan sırla karşılaştırır.
-- Sütun tarayıcıya kapalıdır (20261110230000'deki sütun bazlı okuma izni listesinde yok).
alter table public.ayarlar add column if not exists telegram_webhook_secret text;
