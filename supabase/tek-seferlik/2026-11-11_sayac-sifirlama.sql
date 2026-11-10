-- Yetki testleri (işlem içinde, geri alındı) numara sayaçlarını ilerletti; tablolar boşken sıfırla.
-- Tablo boş değilse dokunmaz.
do $$
begin
  if not exists (select 1 from public.satis_faturalari) then
    alter table public.satis_faturalari alter column satis_no restart with 1;
  end if;
  if not exists (select 1 from public.yevmiye_fisleri) then
    alter table public.yevmiye_fisleri alter column fis_no restart with 1;
  end if;
end;
$$;
