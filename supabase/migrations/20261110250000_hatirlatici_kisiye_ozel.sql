-- Hatırlatıcılar kişiye özel: herkese değil, ilgili kişiye gider.
-- Gönderim sırası (api/hatirlatma-kontrol): hedef kişinin Telegram'ı → oluşturanın Telegram'ı
-- → Telegram'dan kurulduysa geldiği sohbet → hiçbiri yoksa Ayarlar'daki liste (geçiş dönemi).

alter table public.hatirlaticilar
  add column if not exists hedef_kullanici_id uuid references public.profiller(id) on delete set null,
  add column if not exists kaynak_chat_id text;

create index if not exists hatirlaticilar_hedef_idx on public.hatirlaticilar (hedef_kullanici_id);
