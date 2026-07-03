-- Telegram asistani uzerinden (oturumsuz, admin client ile) eklenen kayitlarin
-- bir "olusturan" kullanicisi olmayabilir - bu iki alani esnetiyoruz.
alter table public.islemler alter column olusturan drop not null;
alter table public.hatirlaticilar alter column olusturan drop not null;
