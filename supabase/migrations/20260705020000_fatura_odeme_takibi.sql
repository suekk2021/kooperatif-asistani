-- Fatura odeme takibi: bir islemin "odendi" olarak isaretlenmesi ve odeme
-- belgesinin (dekont) yuklenebilmesi icin. Dekont, mevcut "fisler" storage
-- bucket'ina yuklenir (fis gorseliyle ayni altyapi, ayri bucket gerekmiyor).

alter table public.islemler add column if not exists odendi boolean not null default false;
alter table public.islemler add column if not exists dekont_url text;
