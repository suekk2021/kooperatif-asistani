-- Güvenlik (9 Kas 2026, canlıya almadan önce): ayarlar tablosu giriş yapan herkese
-- (izleyici, muhasebeci dahil) tarayıcıdan doğrudan okunabiliyordu; içinde Gemini/OpenAI
-- API anahtarları ve Telegram bot anahtarı var. Anahtar sütunları tarayıcıya kapatıldı;
-- uygulama bunları sadece sunucuda, servis anahtarıyla okur. Diğer sütunlar okunabilir kalır.
-- (kurum_kimligi görünümü tabloyu sahibinin yetkisiyle okuduğu için giriş ekranı etkilenmez.)

revoke select on public.ayarlar from anon, authenticated;
grant select (id, ocr_saglayici, telegram_chat_id, muhasebeci_email, kurum_adi, logo_url, asistan_promptu, updated_at)
  on public.ayarlar to authenticated;
