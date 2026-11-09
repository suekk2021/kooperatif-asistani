-- Açılış bakiyeleri (9 Kas 2026): programa geçiş günü kasadaki/bankadaki para, carilerin
-- eski borç/alacağı ve depo sayımı. Kooperatif canlıya geçince kendisi girer.
--
-- Her kayıt bir "açılış" fişi üretir; borç ve alacak farkı muhasebecinin söyleyeceği
-- karşı hesaba yazılır (açılış ayarı). Ayar girilmeden açılış kaydedilemez.
-- Parça parça girilebilir (bugün kasa, yarın sayım) — hepsi aynı açılış tarihine.

create table public.acilis_ayarlari (
  id boolean primary key default true check (id),
  karsi_hesap text references public.hesap_plani(kod),
  tarih date,
  updated_at timestamptz not null default now()
);
insert into public.acilis_ayarlari (id) values (true);
create trigger acilis_ayarlari_set_updated_at before update on public.acilis_ayarlari
  for each row execute function public.set_updated_at();
create trigger acilis_ayarlari_kayit after update on public.acilis_ayarlari
  for each row execute function public.degisiklik_kaydet();

alter table public.acilis_ayarlari enable row level security;
create policy "Giris yapan okur" on public.acilis_ayarlari for select using (auth.uid() is not null);
create policy "Yonetici duzenler" on public.acilis_ayarlari for update using (public.yonetici_mi());

-- p: {"para":[{"hesap_id","tutar"}],            kasa/banka/POS: elde olan para (eksi = ek hesap borcu);
--                                                kredi kartı: kart borcu (artı yazılır)
--     "cariler":[{"cari_id","tutar"}],          müşteri: bize borcu; tedarikçi: bizim borcumuz (eksi = avans)
--     "stok":[{"stok_karti_id","miktar","birim_maliyet","lot_no","skt"}],
--     "aciklama": "…"}
create or replace function public.acilis_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_ayar public.acilis_ayarlari; v_satirlar jsonb := '[]'::jsonb; r jsonb; v_kod text; v_tur text;
  v_tutar numeric(14,2); v_borc numeric(14,2) := 0; v_alacak numeric(14,2) := 0; v_fis uuid;
  v_kart public.stok_kartlari; v_miktar numeric; v_bm numeric; v_stok jsonb := '[]'::jsonb;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  select * into v_ayar from public.acilis_ayarlari;
  if v_ayar.karsi_hesap is null or v_ayar.tarih is null then
    raise exception 'Açılış tarihi ve karşı hesap henüz ayarlanmamış (muhasebeciden alınacak; Açılış ekranının üstünden girilir)';
  end if;

  for r in select * from jsonb_array_elements(coalesce(p->'para', '[]')) loop
    v_tutar := round((r->>'tutar')::numeric, 2);
    continue when coalesce(v_tutar, 0) = 0;
    select kod, tur::text into v_kod, v_tur from public.kasa_banka_hesaplari where id = (r->>'hesap_id')::uuid and aktif;
    if v_kod is null then raise exception 'Kasa/banka hesabı bulunamadı'; end if;
    if v_tur = 'kredi_karti' then v_tutar := -v_tutar; end if;  -- kart borcu alacak tarafına
    v_satirlar := v_satirlar || jsonb_build_array(jsonb_build_object('hesap_kodu', v_kod,
                    case when v_tutar > 0 then 'borc' else 'alacak' end, abs(v_tutar)));
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p->'cariler', '[]')) loop
    v_tutar := round((r->>'tutar')::numeric, 2);
    continue when coalesce(v_tutar, 0) = 0;
    select kod, tur::text into v_kod, v_tur from public.cariler where id = (r->>'cari_id')::uuid and aktif;
    if v_kod is null then raise exception 'Cari bulunamadı'; end if;
    if v_tur = 'tedarikci' then v_tutar := -v_tutar; end if;  -- tedarikçiye borç alacak tarafına
    v_satirlar := v_satirlar || jsonb_build_array(jsonb_build_object('hesap_kodu', v_kod,
                    case when v_tutar > 0 then 'borc' else 'alacak' end, abs(v_tutar)));
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p->'stok', '[]')) loop
    v_miktar := (r->>'miktar')::numeric;
    continue when coalesce(v_miktar, 0) = 0;
    if v_miktar < 0 then raise exception 'Sayım miktarı eksi olamaz'; end if;
    v_bm := coalesce((r->>'birim_maliyet')::numeric, 0);
    if v_bm < 0 then raise exception 'Birim maliyet eksi olamaz'; end if;
    select * into v_kart from public.stok_kartlari where id = (r->>'stok_karti_id')::uuid and aktif;
    if not found then raise exception 'Stok kartı bulunamadı'; end if;
    v_tutar := round(v_miktar * v_bm, 2);
    if v_tutar > 0 then
      v_satirlar := v_satirlar || jsonb_build_array(jsonb_build_object('hesap_kodu', v_kart.kod, 'borc', v_tutar));
    end if;
    v_stok := v_stok || jsonb_build_array(jsonb_build_object('kart', v_kart.id, 'miktar', v_miktar, 'bm', v_bm,
                'tutar', v_tutar, 'lot', nullif(trim(r->>'lot_no'), ''), 'skt', nullif(r->>'skt', '')));
  end loop;

  if jsonb_array_length(v_satirlar) = 0 and jsonb_array_length(v_stok) = 0 then
    raise exception 'Girilmiş bir tutar veya miktar yok';
  end if;

  select coalesce(sum((e->>'borc')::numeric), 0), coalesce(sum((e->>'alacak')::numeric), 0)
    into v_borc, v_alacak from jsonb_array_elements(v_satirlar) e;
  if v_borc <> v_alacak then
    v_satirlar := v_satirlar || jsonb_build_array(jsonb_build_object('hesap_kodu', v_ayar.karsi_hesap,
                    case when v_borc > v_alacak then 'alacak' else 'borc' end, abs(v_borc - v_alacak),
                    'aciklama', 'Açılış karşılığı'));
  end if;

  -- Sadece maliyetsiz stok girildiyse (tutar 0) fiş gerekmez; hareket yine yazılır.
  if jsonb_array_length(v_satirlar) >= 2 then
    v_fis := public.fis_olustur(v_ayar.tarih, coalesce(nullif(trim(p->>'aciklama'), ''), 'Açılış kaydı'), 'acilis', null, v_satirlar);
  end if;

  insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, lot_no, skt, aciklama)
  select v_ayar.tarih, (s->>'kart')::uuid, (s->>'miktar')::numeric, (s->>'bm')::numeric, (s->>'tutar')::numeric,
         'acilis', v_fis, s->>'lot', (s->>'skt')::date, 'Açılış sayımı'
    from jsonb_array_elements(v_stok) s;

  return v_fis;
end;
$$;

-- Yanlış girilen açılış kaydı ters kayıtla geri alınır (stok hareketleri dahil).
create or replace function public.acilis_iptal(p_fis uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
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
$$;

revoke execute on function public.acilis_kaydet(jsonb) from public, anon;
revoke execute on function public.acilis_iptal(uuid, text) from public, anon;
grant execute on function public.acilis_kaydet(jsonb) to authenticated;
grant execute on function public.acilis_iptal(uuid, text) to authenticated;
