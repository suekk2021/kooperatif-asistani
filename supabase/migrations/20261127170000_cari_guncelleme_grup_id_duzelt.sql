-- Cari kartı güncellenemiyordu: "record "new" has no field "grup_id"".
-- Sebep: 20261113110000_stok_gruplari.sql'de kart_hesabi_ac() içine
--   if tg_table_name = 'stok_kartlari' and new.grup_id <> old.grup_id
-- eklendi. PL/pgSQL "and" ifadesini kısa devre ile değerlendirmeyi garanti etmez ve
-- cariler satırında grup_id alanı olmadığı için her cari UPDATE'i hata verdi
-- (cari EKLEME çalışıyordu, çünkü o dal bu ifadeyi içermez).
-- Düzeltme: grup_id kontrolü, tablo kontrolünden sonra iç içe if ile yapılır.
-- Fonksiyonun geri kalanı 20261113110000 ile birebir aynı.

create or replace function public.kart_hesabi_ac()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ad text; v_ust text; v_grup public.stok_gruplari;
begin
  if tg_table_name = 'cariler' then
    v_ad := new.unvan;
    v_ust := case new.tur when 'musteri' then '120.01' else '320.01' end;
  else
    v_ad := new.ad;
    select * into v_grup from public.stok_gruplari where id = new.grup_id;
    if v_grup.id is null then raise exception 'Stok grubu seçilmedi'; end if;
    if v_grup.tur <> new.tur then
      raise exception 'Kart türü, seçilen grubun türüyle (%) aynı olmalı', v_grup.tur;
    end if;
    v_ust := v_grup.ana_kod || '.' || v_grup.grup_kodu;
  end if;

  if tg_op = 'INSERT' then
    if tg_table_name = 'stok_kartlari' and not v_grup.aktif then
      raise exception 'Bu stok grubu kapalı; kart açılamaz';
    end if;
    if new.kod is null then
      new.kod := public.sonraki_alt_kod(v_ust);
    elsif public.hesap_plani_ust(new.kod) is distinct from v_ust then
      raise exception 'Kod % bu grup için % altında olmalı', new.kod, v_ust;
    end if;
    insert into public.hesap_plani (kod, ad) values (new.kod, v_ad)
      on conflict (kod) do nothing;
  else
    if new.kod <> old.kod or new.tur <> old.tur then
      raise exception 'Kartın kodu ve türü değiştirilemez';
    end if;
    if tg_table_name = 'stok_kartlari' then
      if new.grup_id <> old.grup_id then
        raise exception 'Kartın grubu değiştirilemez';
      end if;
    end if;
    update public.hesap_plani set ad = v_ad, aktif = new.aktif
     where kod = new.kod and (ad <> v_ad or aktif <> new.aktif);
  end if;
  return new;
end;
$$;
