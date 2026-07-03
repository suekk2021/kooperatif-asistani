-- Telegram bildirim ayarlari (bot token + sohbet ID'si) - ayarlar tablosuna eklendi.
alter table public.ayarlar
  add column telegram_bot_token text,
  add column telegram_chat_id text;
