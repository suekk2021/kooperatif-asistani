-- Yalnızca hata mesajı: "Yöneticiye başvurun" teknik destek hesabını da kapsadığı için karışıyordu (kullanıcı kararı, 11 Kas 2026).
-- Yetki kuralı değişmedi.
create or replace function public.iptal_izni_kontrol(p_tablo text, p_id uuid)
returns void
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare v_olusturan uuid; v_zaman timestamptz;
begin
  if p_tablo not in ('para_hareketleri', 'alis_faturalari', 'satis_faturalari', 'uretim_partileri', 'sayimlar',
                     'yevmiye_fisleri', 'iadeler', 'evrak_hareketleri') then
    raise exception 'Bilinmeyen kayıt türü: %', p_tablo;
  end if;
  execute format('select olusturan, created_at from public.%I where id = $1', p_tablo)
    into v_olusturan, v_zaman using p_id;
  if v_zaman is null then raise exception 'Kayıt bulunamadı'; end if;
  if not public.iptal_izni(v_olusturan, v_zaman) then
    raise exception 'Bu kaydı iptal edemezsiniz: ön muhasebe yalnızca kendi girdiği kaydı aynı gün iptal edebilir. Kooperatif yönetimine (Başkan ya da Operasyon yöneticisi) başvurun.';
  end if;
end;
$function$;
