-- Açılış bakiyelerini programı kuran kişi (ön muhasebe) girebilsin — kullanıcı kararı, 11 Kas 2026.
--   * Açılış bakiyesi girmek: yönetici + ön muhasebe (daha önce yalnız yönetici).
--   * Açılış tarihi ve karşı hesap AYARI yönetici işi olarak kalır (acilis_ayarlari UPDATE politikası değişmedi):
--     açılış fişlerindeki farkın hangi hesaba yazılacağı en kolay yanlışlanan karar, ikinci göz kalsın.
--   * Açılış kaydını iptal: yönetici her zaman; ön muhasebe yalnızca kendi girdiğini aynı gün
--     (diğer belgelerdeki iptal kuralı ile aynı; yevmiye_fisleri iptal_izni_kontrol listesinde zaten var).

create or replace function public.islem_izni(p_islem text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.yonetici_mi() or exists (
    select 1 from public.profiller
     where id = auth.uid()
       and case p_islem
             when 'alis'   then rol::text in ('on_muhasebe', 'depo')
             when 'uretim' then rol::text in ('on_muhasebe', 'depo')
             when 'sayim'  then rol::text in ('on_muhasebe', 'depo')
             when 'satis'  then rol::text = 'on_muhasebe'
             when 'kasa'   then rol::text = 'on_muhasebe'
             when 'acilis' then rol::text = 'on_muhasebe'
             else false
           end);
$function$;

create or replace function public.acilis_iptal(p_fis uuid, p_neden text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.islem_izni_kontrol('acilis');
  perform public.iptal_izni_kontrol('yevmiye_fisleri', p_fis);
  if nullif(trim(p_neden), '') is null then raise exception 'İptal nedeni yazılmalı'; end if;
  if not exists (select 1 from public.yevmiye_fisleri where id = p_fis and kaynak_tur = 'acilis') then
    raise exception 'Açılış kaydı bulunamadı';
  end if;
  if exists (select 1 from public.yevmiye_fisleri where iptal_edilen_fis = p_fis) then
    raise exception 'Bu açılış kaydı zaten iptal edilmiş';
  end if;
  insert into public.stok_hareketleri
    (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, iptal_edilen_hareket, lot_no, aciklama)
  select current_date, stok_karti_id, -miktar, birim_maliyet, -tutar, 'iptal', p_fis, id, lot_no, 'Açılış iptali: ' || p_neden
    from public.stok_hareketleri where kaynak_tur = 'acilis' and kaynak_id = p_fis;
  perform public.fis_iptal(p_fis, 'Açılış iptali: ' || p_neden);
end;
$function$;
