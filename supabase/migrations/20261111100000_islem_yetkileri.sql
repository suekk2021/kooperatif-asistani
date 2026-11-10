-- İşlem bazlı yetki (Zafer Kara gözden geçirmesi, kullanıcı onayı 10 Kas 2026):
--   alış, üretim, sayım      → yönetici, ön muhasebe, depo
--   satış, kasa/banka        → yönetici, ön muhasebe
--   açılış                   → yalnız yönetici
--   iptal                    → yönetici her zaman; ön muhasebe yalnız kendi girdiğini, aynı gün (İstanbul)
-- Ayrıca işlem geçmişini (degisiklik_kaydi) muhasebeci de okur.

create or replace function public.islem_izni(p_islem text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.yonetici_mi() or exists (
    select 1 from public.profiller
     where id = auth.uid()
       and case p_islem
             when 'alis'   then rol::text in ('on_muhasebe', 'depo')
             when 'uretim' then rol::text in ('on_muhasebe', 'depo')
             when 'sayim'  then rol::text in ('on_muhasebe', 'depo')
             when 'satis'  then rol::text = 'on_muhasebe'
             when 'kasa'   then rol::text = 'on_muhasebe'
             else false
           end);
$$;

create or replace function public.islem_izni_kontrol(p_islem text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.islem_izni(p_islem) then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
end;
$$;

-- Ekranın "İptal et" düğmesini göstermek için de kullanılır.
create or replace function public.iptal_izni(p_olusturan uuid, p_zaman timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select public.yonetici_mi() or exists (
    select 1 from public.profiller
     where id = auth.uid()
       and rol::text = 'on_muhasebe'
       and p_olusturan = auth.uid()
       and (p_zaman at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date);
$$;

create or replace function public.iptal_izni_kontrol(p_tablo text, p_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare v_olusturan uuid; v_zaman timestamptz;
begin
  if p_tablo not in ('para_hareketleri', 'alis_faturalari', 'satis_faturalari', 'uretim_partileri', 'sayimlar', 'yevmiye_fisleri') then
    raise exception 'Bilinmeyen kayıt türü: %', p_tablo;
  end if;
  execute format('select olusturan, created_at from public.%I where id = $1', p_tablo)
    into v_olusturan, v_zaman using p_id;
  if v_zaman is null then raise exception 'Kayıt bulunamadı'; end if;
  if not public.iptal_izni(v_olusturan, v_zaman) then
    raise exception 'Bu kaydı iptal edemezsiniz: ön muhasebe yalnızca kendi girdiği kaydı aynı gün iptal edebilir. Yöneticiye başvurun.';
  end if;
end;
$$;

-- Mevcut fonksiyonlardaki genel yetki satırını işleme özel kontrolle değiştir.
-- Gövdeler elle kopyalanmıyor; satır tam olarak bir kez bulunmazsa migration durur.
do $$
declare
  eski constant text := 'if not public.yazabilir() then raise exception ''Bu işlem için yetkiniz yok''; end if;';
  r record;
  tanim text;
begin
  for r in
    select * from (values
      ('para_hareketi_kaydet(jsonb)',      'perform public.islem_izni_kontrol(''kasa'');'),
      ('para_hareketi_iptal(uuid,text)',   'perform public.islem_izni_kontrol(''kasa''); perform public.iptal_izni_kontrol(''para_hareketleri'', p_id);'),
      ('alis_kaydet(jsonb)',               'perform public.islem_izni_kontrol(''alis'');'),
      ('alis_iptal(uuid,text)',            'perform public.islem_izni_kontrol(''alis''); perform public.iptal_izni_kontrol(''alis_faturalari'', p_id);'),
      ('satis_kaydet(jsonb)',              'perform public.islem_izni_kontrol(''satis'');'),
      ('satis_iptal(uuid,text)',           'perform public.islem_izni_kontrol(''satis''); perform public.iptal_izni_kontrol(''satis_faturalari'', p_id);'),
      ('parti_baslat(jsonb)',              'perform public.islem_izni_kontrol(''uretim'');'),
      ('parti_tamamla(uuid,jsonb)',        'perform public.islem_izni_kontrol(''uretim'');'),
      ('parti_iptal(uuid,text)',           'perform public.islem_izni_kontrol(''uretim''); perform public.iptal_izni_kontrol(''uretim_partileri'', p_id);'),
      ('sayim_kaydet(jsonb)',              'perform public.islem_izni_kontrol(''sayim'');'),
      ('sayim_iptal(uuid,text)',           'perform public.islem_izni_kontrol(''sayim''); perform public.iptal_izni_kontrol(''sayimlar'', p_id);'),
      ('acilis_kaydet(jsonb)',             'perform public.islem_izni_kontrol(''acilis'');'),
      ('acilis_iptal(uuid,text)',          'perform public.islem_izni_kontrol(''acilis'');')
    ) as t(imza, yeni)
  loop
    tanim := pg_get_functiondef(('public.' || r.imza)::regprocedure);
    if (length(tanim) - length(replace(tanim, eski, ''))) / length(eski) <> 1 then
      raise exception 'Yetki satırı % içinde tam bir kez bulunamadı', r.imza;
    end if;
    execute replace(tanim, eski, r.yeni);
  end loop;
end;
$$;

drop policy if exists "Baskan okur" on public.degisiklik_kaydi;
create policy "Yonetici ve muhasebeci okur" on public.degisiklik_kaydi for select using (
  public.yonetici_mi() or exists (select 1 from public.profiller where id = auth.uid() and rol::text = 'muhasebeci')
);
