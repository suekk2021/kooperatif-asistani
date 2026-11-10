-- İade ve iskonto (Zafer Kara gözden geçirmesi; kullanıcı onayı 11 Kas 2026)
--
-- İSKONTO
--   Satış: satır iskontosu % + genel (fatura altı) iskonto %. Net = brüt × (1 − satır%) × (1 − genel%).
--          KDV net üzerinden. Fiş: A 600.01 brüt, B 611 iskonto (TDHP: satış iskontoları ayrı izlenir).
--          satis_kalemleri.tutar artık NET tutardır (KDV matrahı); brüt = tutar + iskonto_tutari.
--   Alış:  tedarikçi iskontosu doğrudan maliyetten düşer (ayrı hesap yok); alis_kalemleri.tutar net.
--
-- İADE (kısmi olabilir, kaynak faturaya bağlı)
--   Satış iadesi: B 610 (net) + B 391.xx (KDV) / A müşteri; stoğa geri alınan kalem için
--                 B 152|153 / A 620.01|621 (satıştaki birim maliyetle). Stoğa alınmayan (bozuk/imha)
--                 kalemin maliyeti 620'de kalır. İsteğe bağlı para iadesi: ödeme (B müşteri / A kasa).
--   Alış iadesi:  B tedarikçi / A 15x (alıştaki net birim fiyatla) + A 191.xx. İsteğe bağlı para iadesi:
--                 tahsilat (B kasa / A tedarikçi).
--   Bir kalemden iade edilebilecek miktar: satılan/alınan − iptal edilmemiş önceki iadeler.

-- 1) İskonto alanları
alter table public.satis_faturalari
  add column genel_iskonto_orani numeric(5,2) not null default 0 check (genel_iskonto_orani >= 0 and genel_iskonto_orani < 100),
  add column iskonto_toplam numeric(14,2) not null default 0 check (iskonto_toplam >= 0);
alter table public.satis_kalemleri
  add column iskonto_orani numeric(5,2) not null default 0 check (iskonto_orani >= 0 and iskonto_orani < 100),
  add column iskonto_tutari numeric(14,2) not null default 0 check (iskonto_tutari >= 0);
alter table public.alis_faturalari
  add column genel_iskonto_orani numeric(5,2) not null default 0 check (genel_iskonto_orani >= 0 and genel_iskonto_orani < 100),
  add column iskonto_toplam numeric(14,2) not null default 0 check (iskonto_toplam >= 0);
alter table public.alis_kalemleri
  add column iskonto_orani numeric(5,2) not null default 0 check (iskonto_orani >= 0 and iskonto_orani < 100),
  add column iskonto_tutari numeric(14,2) not null default 0 check (iskonto_tutari >= 0);

-- 2) İade tabloları
create table public.iadeler (
  id uuid primary key default gen_random_uuid(),
  iade_no bigint generated always as identity unique,
  tur text not null check (tur in ('satis', 'alis')),
  satis_fatura_id uuid references public.satis_faturalari(id),
  alis_fatura_id uuid references public.alis_faturalari(id),
  cari_id uuid not null references public.cariler(id),
  tarih date not null,
  belge_no text,
  aciklama text,
  ara_toplam numeric(14,2) not null,
  kdv_toplam numeric(14,2) not null,
  genel_toplam numeric(14,2) not null check (genel_toplam > 0),
  maliyet_toplam numeric(14,2) not null default 0,
  odeme_hesap_id uuid references public.kasa_banka_hesaplari(id),
  durum text not null default 'kayitli' check (durum in ('kayitli', 'iptal')),
  iptal_nedeni text,
  fis_id uuid references public.yevmiye_fisleri(id),
  iptal_fis_id uuid references public.yevmiye_fisleri(id),
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (genel_toplam = ara_toplam + kdv_toplam),
  check ((tur = 'satis') = (satis_fatura_id is not null)),
  check ((tur = 'alis') = (alis_fatura_id is not null))
);
create index iadeler_satis_idx on public.iadeler (satis_fatura_id);
create index iadeler_alis_idx on public.iadeler (alis_fatura_id);

create table public.iade_kalemleri (
  id bigint generated always as identity primary key,
  iade_id uuid not null references public.iadeler(id),
  sira smallint not null,
  satis_kalem_id bigint references public.satis_kalemleri(id),
  alis_kalem_id bigint references public.alis_kalemleri(id),
  stok_karti_id uuid not null references public.stok_kartlari(id),
  lot_no text,
  miktar numeric(14,3) not null check (miktar > 0),
  birim_fiyat numeric(14,4) not null check (birim_fiyat >= 0),
  kdv_orani numeric(5,2) not null references public.kdv_oranlari(oran),
  tutar numeric(14,2) not null check (tutar >= 0),
  kdv_tutari numeric(14,2) not null check (kdv_tutari >= 0),
  stoga_alindi boolean not null default true,
  birim_maliyet numeric(14,4) not null default 0,
  maliyet_tutari numeric(14,2) not null default 0,
  check ((satis_kalem_id is null) <> (alis_kalem_id is null)),
  unique (iade_id, sira)
);
create index iade_kalemleri_satis_idx on public.iade_kalemleri (satis_kalem_id);
create index iade_kalemleri_alis_idx on public.iade_kalemleri (alis_kalem_id);

alter table public.para_hareketleri add column iade_id uuid references public.iadeler(id);

alter table public.stok_hareketleri drop constraint stok_hareketleri_kaynak_tur_check;
alter table public.stok_hareketleri add constraint stok_hareketleri_kaynak_tur_check check (kaynak_tur in
  ('alis', 'satis', 'uretim_girdi', 'uretim_cikti', 'sayim', 'acilis', 'iptal', 'iade'));
alter table public.yevmiye_fisleri drop constraint yevmiye_fisleri_kaynak_tur_check;
alter table public.yevmiye_fisleri add constraint yevmiye_fisleri_kaynak_tur_check check (kaynak_tur in
  ('acilis', 'alis', 'satis', 'uretim', 'tahsilat', 'odeme', 'virman', 'sayim', 'manuel', 'iptal', 'iade'));

create trigger iadeler_kayit after insert or update or delete on public.iadeler
  for each row execute function public.degisiklik_kaydet();

alter table public.iadeler enable row level security;
alter table public.iade_kalemleri enable row level security;
create policy "Giris yapan okur" on public.iadeler for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.iade_kalemleri for select using (auth.uid() is not null);

-- 3) Satış (iskontolu)
-- p: {..., "genel_iskonto_orani": 5, "kalemler":[{"stok_karti_id","miktar","birim_fiyat","kdv_orani","iskonto_orani","lot_no"}]}
create or replace function public.satis_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_cari public.cariler; v_tarih date := coalesce((p->>'tarih')::date, current_date);
  v_odeme uuid; v_hareket uuid; v_ara numeric(14,2); v_kdv numeric(14,2); v_maliyet numeric(14,2); v_isk numeric(14,2);
  v_satirlar jsonb; k jsonb; v_sira int := 0; v_kart public.stok_kartlari;
  v_brut numeric(14,2); v_tutar numeric(14,2); v_kdv_t numeric(14,2); v_bm numeric; v_tahmini boolean; v_no bigint;
  v_genel numeric := coalesce(nullif(p->>'genel_iskonto_orani', '')::numeric, 0); v_satir_isk numeric;
begin
  perform public.islem_izni_kontrol('satis');
  if v_genel < 0 or v_genel >= 100 then raise exception 'Genel iskonto 0 ile 100 arasında olmalı'; end if;

  select * into v_cari from public.cariler where id = (p->>'cari_id')::uuid and aktif;
  if not found then raise exception 'Müşteri seçilmedi'; end if;
  if v_cari.tur <> 'musteri' then raise exception '% bir tedarikçi kartı; satış müşteriye yapılır', v_cari.unvan; end if;
  if jsonb_typeof(p->'kalemler') <> 'array' or jsonb_array_length(p->'kalemler') = 0 then
    raise exception 'Satışta en az bir kalem olmalı';
  end if;

  v_odeme := nullif(p->>'odeme_hesap_id', '')::uuid;
  if v_odeme is not null and not exists (select 1 from public.kasa_banka_hesaplari
                                          where id = v_odeme and aktif and tur <> 'kredi_karti') then
    raise exception 'Tahsilat hesabı geçersiz (kasa, banka veya POS olmalı)';
  end if;

  insert into public.satis_faturalari
    (cari_id, belge_no, tarih, vade_tarihi, aciklama, ara_toplam, kdv_toplam, genel_toplam, odeme_hesap_id, genel_iskonto_orani)
  values (v_cari.id, nullif(trim(p->>'belge_no'), ''), v_tarih,
          coalesce((p->>'vade_tarihi')::date, case when v_odeme is null then v_tarih + v_cari.vade_gun end),
          -- Toplamlar kalemler yazıldıktan sonra güncellenir; buradaki 1/0/1 geçici.
          nullif(trim(p->>'aciklama'), ''), 1, 0, 1, v_odeme, v_genel)
  returning id, satis_no into v_id, v_no;

  for k in select * from jsonb_array_elements(p->'kalemler') loop
    v_sira := v_sira + 1;
    select * into v_kart from public.stok_kartlari
     where id = (k->>'stok_karti_id')::uuid and aktif and birlestirildigi_kart is null;
    if not found then raise exception '%. kalem: ürün bulunamadı', v_sira; end if;
    if v_kart.tur not in ('mamul', 'ticari_mal') then
      raise exception '%. kalem: % bir %; satışta ürün veya ticari mal olmalı', v_sira, v_kart.ad, v_kart.tur;
    end if;
    if coalesce((k->>'miktar')::numeric, 0) <= 0 then raise exception '%. kalem: miktar sıfırdan büyük olmalı', v_sira; end if;
    v_satir_isk := coalesce(nullif(k->>'iskonto_orani', '')::numeric, 0);
    if v_satir_isk < 0 or v_satir_isk >= 100 then raise exception '%. kalem: iskonto 0 ile 100 arasında olmalı', v_sira; end if;

    v_brut := round((k->>'miktar')::numeric * (k->>'birim_fiyat')::numeric, 2);
    v_tutar := round((k->>'miktar')::numeric * (k->>'birim_fiyat')::numeric * (1 - v_satir_isk / 100) * (1 - v_genel / 100), 2);
    v_kdv_t := round(v_tutar * coalesce((k->>'kdv_orani')::numeric, 0) / 100, 2);
    select maliyet, tahmini into v_bm, v_tahmini from public.guncel_birim_maliyet(v_kart.id, (k->>'miktar')::numeric);

    insert into public.satis_kalemleri
      (fatura_id, sira, stok_karti_id, lot_no, miktar, birim_fiyat, kdv_orani, tutar, kdv_tutari,
       birim_maliyet, maliyet_tutari, maliyet_tahmini, iskonto_orani, iskonto_tutari)
    values (v_id, v_sira, v_kart.id, nullif(trim(k->>'lot_no'), ''), (k->>'miktar')::numeric,
            (k->>'birim_fiyat')::numeric, coalesce((k->>'kdv_orani')::numeric, 0), v_tutar, v_kdv_t,
            v_bm, round(v_bm * (k->>'miktar')::numeric, 2), v_tahmini, v_satir_isk, v_brut - v_tutar);

    -- Aynı faturada aynı ürün iki satırda olabilir; her satır anında stoktan düşer ki
    -- ikinci satırın maliyeti güncel stoktan hesaplansın.
    insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, lot_no)
    values (v_tarih, v_kart.id, -(k->>'miktar')::numeric, v_bm, -round(v_bm * (k->>'miktar')::numeric, 2),
            'satis', v_id, nullif(trim(k->>'lot_no'), ''));
  end loop;

  select sum(tutar), sum(kdv_tutari), sum(maliyet_tutari), sum(iskonto_tutari) into v_ara, v_kdv, v_maliyet, v_isk
    from public.satis_kalemleri where fatura_id = v_id;
  if v_ara + v_kdv <= 0 then raise exception 'Satış toplamı sıfır olamaz'; end if;
  update public.satis_faturalari
     set ara_toplam = v_ara, kdv_toplam = v_kdv, genel_toplam = v_ara + v_kdv, maliyet_toplam = v_maliyet, iskonto_toplam = v_isk
   where id = v_id;

  -- Fiş: B müşteri + B 611 (iskonto) / A 600.01 (brüt) + A 391.xx ; B 620.01|621 / A 152.xx|153.xx (maliyet)
  with k as (select sk.*, s.kod as stok_kod, s.tur as stok_tur
               from public.satis_kalemleri sk join public.stok_kartlari s on s.id = sk.stok_karti_id
              where sk.fatura_id = v_id),
  satirlar as (
    select 1 as grup, v_cari.kod as hesap, v_ara + v_kdv as borc, 0::numeric as alacak
    union all
    select 2, '611', sum(iskonto_tutari), 0 from k having sum(iskonto_tutari) > 0
    union all
    select 3, '600.01', 0, sum(tutar + iskonto_tutari) from k having sum(tutar + iskonto_tutari) > 0
    union all
    select 4, o.hesaplanan_kod, 0, sum(k.kdv_tutari) from k join public.kdv_oranlari o on o.oran = k.kdv_orani
     where k.kdv_tutari > 0 group by o.hesaplanan_kod
    union all
    select 5, case when stok_tur = 'mamul' then '620.01' else '621' end, sum(maliyet_tutari), 0
      from k where maliyet_tutari > 0 group by 2
    union all
    select 6, stok_kod, 0, sum(maliyet_tutari) from k where maliyet_tutari > 0 group by stok_kod
  )
  select jsonb_agg(jsonb_build_object('hesap_kodu', hesap, 'borc', borc, 'alacak', alacak) order by grup, hesap)
    into v_satirlar from satirlar;

  update public.satis_faturalari
     set fis_id = public.fis_olustur(v_tarih,
                    'Satış ' || coalesce(nullif(trim(p->>'belge_no'), ''), 'SAT-' || v_no) || ' · ' || v_cari.unvan,
                    'satis', v_id, v_satirlar)
   where id = v_id;

  if v_odeme is not null then
    insert into public.para_hareketleri (tarih, tur, hesap_id, cari_id, tutar, belge_no, satis_fatura_id, aciklama)
    values (v_tarih, 'tahsilat', v_odeme, v_cari.id, v_ara + v_kdv,
            coalesce(nullif(trim(p->>'belge_no'), ''), 'SAT-' || v_no), v_id,
            'Satış ' || coalesce(nullif(trim(p->>'belge_no'), ''), 'SAT-' || v_no))
    returning id into v_hareket;
    perform public.para_hareketi_fisle(v_hareket);
  end if;

  return v_id;
end;
$$;

-- 4) Alış (iskontolu): net birim maliyet = birim_fiyat × (1 − satır%) × (1 − genel%)
create or replace function public.alis_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_cari public.cariler; v_tarih date := coalesce((p->>'tarih')::date, current_date);
  v_ara numeric(14,2); v_kdv numeric(14,2); v_isk numeric(14,2); v_satirlar jsonb; v_odeme uuid; v_hareket uuid;
  k jsonb; v_sira int := 0; v_brut numeric(14,2); v_tutar numeric(14,2); v_kdv_t numeric(14,2);
  v_genel numeric := coalesce(nullif(p->>'genel_iskonto_orani', '')::numeric, 0); v_satir_isk numeric;
begin
  perform public.islem_izni_kontrol('alis');
  if v_genel < 0 or v_genel >= 100 then raise exception 'Genel iskonto 0 ile 100 arasında olmalı'; end if;

  select * into v_cari from public.cariler where id = (p->>'cari_id')::uuid and aktif;
  if not found then raise exception 'Tedarikçi seçilmedi'; end if;
  if v_cari.tur <> 'tedarikci' then raise exception '% bir müşteri kartı; alış tedarikçiden yapılır', v_cari.unvan; end if;
  if nullif(trim(p->>'belge_no'), '') is null then raise exception 'Fatura numarası zorunlu'; end if;
  if jsonb_typeof(p->'kalemler') <> 'array' or jsonb_array_length(p->'kalemler') = 0 then
    raise exception 'Faturada en az bir kalem olmalı';
  end if;

  v_odeme := nullif(p->>'odeme_hesap_id', '')::uuid;
  if v_odeme is not null and not exists (select 1 from public.kasa_banka_hesaplari where id = v_odeme and aktif and tur <> 'pos') then
    raise exception 'Ödeme hesabı geçersiz';
  end if;

  insert into public.alis_faturalari
    (cari_id, belge_no, tarih, vade_tarihi, aciklama, ara_toplam, kdv_toplam, genel_toplam, odeme_hesap_id, genel_iskonto_orani)
  values (v_cari.id, trim(p->>'belge_no'), v_tarih,
          coalesce((p->>'vade_tarihi')::date, case when v_odeme is null then v_tarih + v_cari.vade_gun end),
          -- Toplamlar kalemler yazıldıktan sonra güncellenir; buradaki 1/0/1 geçici.
          nullif(trim(p->>'aciklama'), ''), 1, 0, 1, v_odeme, v_genel)
  returning id into v_id;

  for k in select * from jsonb_array_elements(p->'kalemler') loop
    v_sira := v_sira + 1;
    if (k->>'stok_karti_id') is not null then
      if not exists (select 1 from public.stok_kartlari where id = (k->>'stok_karti_id')::uuid
                       and aktif and birlestirildigi_kart is null) then
        raise exception '%. kalem: stok kartı bulunamadı', v_sira;
      end if;
    elsif coalesce(k->>'hesap_kodu', '') !~ '^(25[0-9]|26[0-9]|7[0-9]0)' then
      raise exception '%. kalem: gider hesabı geçersiz (%)', v_sira, k->>'hesap_kodu';
    end if;
    if coalesce((k->>'miktar')::numeric, 0) <= 0 then raise exception '%. kalem: miktar sıfırdan büyük olmalı', v_sira; end if;
    v_satir_isk := coalesce(nullif(k->>'iskonto_orani', '')::numeric, 0);
    if v_satir_isk < 0 or v_satir_isk >= 100 then raise exception '%. kalem: iskonto 0 ile 100 arasında olmalı', v_sira; end if;

    v_brut := round((k->>'miktar')::numeric * (k->>'birim_fiyat')::numeric, 2);
    v_tutar := round((k->>'miktar')::numeric * (k->>'birim_fiyat')::numeric * (1 - v_satir_isk / 100) * (1 - v_genel / 100), 2);
    v_kdv_t := round(v_tutar * coalesce((k->>'kdv_orani')::numeric, 0) / 100, 2);
    insert into public.alis_kalemleri
      (fatura_id, sira, stok_karti_id, hesap_kodu, aciklama, miktar, birim_fiyat, kdv_orani, tutar, kdv_tutari, iskonto_orani, iskonto_tutari)
    values (v_id, v_sira, (k->>'stok_karti_id')::uuid,
            case when k->>'stok_karti_id' is null then k->>'hesap_kodu' end,
            nullif(trim(k->>'aciklama'), ''), (k->>'miktar')::numeric, (k->>'birim_fiyat')::numeric,
            coalesce((k->>'kdv_orani')::numeric, 0), v_tutar, v_kdv_t, v_satir_isk, v_brut - v_tutar);
  end loop;

  select sum(tutar), sum(kdv_tutari), sum(iskonto_tutari) into v_ara, v_kdv, v_isk from public.alis_kalemleri where fatura_id = v_id;
  if v_ara + v_kdv <= 0 then raise exception 'Fatura toplamı sıfır olamaz'; end if;
  -- Toplamlar kalemlerden hesaplanır; istemciden gelen toplama güvenilmez.
  update public.alis_faturalari set ara_toplam = v_ara, kdv_toplam = v_kdv, genel_toplam = v_ara + v_kdv, iskonto_toplam = v_isk where id = v_id;

  insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id)
  select v_tarih, stok_karti_id, miktar, case when miktar > 0 then round(tutar / miktar, 4) else 0 end, tutar, 'alis', v_id
    from public.alis_kalemleri where fatura_id = v_id and stok_karti_id is not null;

  with k as (select * from public.alis_kalemleri where fatura_id = v_id),
  borclar as (
    select s.kod as hesap, sum(k.tutar) as tutar from k join public.stok_kartlari s on s.id = k.stok_karti_id group by s.kod
    union all
    select k.hesap_kodu, sum(k.tutar) from k where k.hesap_kodu is not null group by k.hesap_kodu
    union all
    select o.indirilecek_kod, sum(k.kdv_tutari) from k join public.kdv_oranlari o on o.oran = k.kdv_orani
     where k.kdv_tutari > 0 group by o.indirilecek_kod
  )
  select jsonb_agg(jsonb_build_object('hesap_kodu', hesap, 'borc', tutar) order by hesap)
    into v_satirlar from borclar where tutar > 0;
  v_satirlar := v_satirlar || jsonb_build_array(jsonb_build_object('hesap_kodu', v_cari.kod, 'alacak', v_ara + v_kdv));

  update public.alis_faturalari
     set fis_id = public.fis_olustur(v_tarih, 'Alış faturası ' || trim(p->>'belge_no') || ' · ' || v_cari.unvan,
                                     'alis', v_id, v_satirlar)
   where id = v_id;

  if v_odeme is not null then
    insert into public.para_hareketleri (tarih, tur, hesap_id, cari_id, tutar, belge_no, alis_fatura_id, aciklama)
    values (v_tarih, 'odeme', v_odeme, v_cari.id, v_ara + v_kdv, trim(p->>'belge_no'), v_id,
            'Fatura ' || trim(p->>'belge_no'))
    returning id into v_hareket;
    perform public.para_hareketi_fisle(v_hareket);
  end if;

  return v_id;
end;
$$;

-- 5) İade kaydı
-- p: {"tur":"satis|alis","fatura_id":"…","tarih":"…","belge_no":"…","aciklama":"…","odeme_hesap_id":null|"…",
--     "kalemler":[{"kalem_id":123,"miktar":5,"stoga_al":true}]}
create or replace function public.iade_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_tur text := p->>'tur'; v_fatura uuid := (p->>'fatura_id')::uuid;
  v_tarih date := coalesce((p->>'tarih')::date, current_date);
  v_cari public.cariler; v_cari_id uuid; v_id uuid; v_no bigint; v_odeme uuid; v_hareket uuid; v_fatura_no text;
  k jsonb; v_sira int := 0; v_miktar numeric; v_kalan numeric; v_stoga boolean;
  sk public.satis_kalemleri; ak public.alis_kalemleri; v_kart public.stok_kartlari;
  v_birim numeric; v_tutar numeric(14,2); v_kdv_t numeric(14,2); v_bm numeric; v_maliyet numeric(14,2);
  v_ara numeric(14,2); v_kdv numeric(14,2); v_mal numeric(14,2); v_satirlar jsonb;
begin
  if v_tur not in ('satis', 'alis') then raise exception 'İade türü geçersiz'; end if;
  perform public.islem_izni_kontrol(v_tur);
  if jsonb_typeof(p->'kalemler') <> 'array' or jsonb_array_length(p->'kalemler') = 0 then
    raise exception 'İadede en az bir kalem olmalı';
  end if;

  if v_tur = 'satis' then
    select cari_id, coalesce(belge_no, 'SAT-' || satis_no) into v_cari_id, v_fatura_no
      from public.satis_faturalari where id = v_fatura and durum = 'kayitli';
  else
    select cari_id, belge_no into v_cari_id, v_fatura_no
      from public.alis_faturalari where id = v_fatura and durum = 'kayitli';
  end if;
  if v_cari_id is null then raise exception 'Fatura bulunamadı veya iptal edilmiş'; end if;
  select * into v_cari from public.cariler where id = v_cari_id;

  v_odeme := nullif(p->>'odeme_hesap_id', '')::uuid;
  if v_odeme is not null and not exists (select 1 from public.kasa_banka_hesaplari
                                          where id = v_odeme and aktif and tur in ('kasa', 'banka')) then
    raise exception 'Para iadesi hesabı kasa veya banka olmalı';
  end if;

  insert into public.iadeler (tur, satis_fatura_id, alis_fatura_id, cari_id, tarih, belge_no, aciklama,
                              ara_toplam, kdv_toplam, genel_toplam, odeme_hesap_id)
  values (v_tur, case when v_tur = 'satis' then v_fatura end, case when v_tur = 'alis' then v_fatura end,
          v_cari.id, v_tarih, nullif(trim(p->>'belge_no'), ''), nullif(trim(p->>'aciklama'), ''), 1, 0, 1, v_odeme)
  returning id, iade_no into v_id, v_no;

  for k in select * from jsonb_array_elements(p->'kalemler') loop
    v_miktar := coalesce(nullif(k->>'miktar', '')::numeric, 0);
    continue when v_miktar = 0;
    v_sira := v_sira + 1;
    if v_miktar < 0 then raise exception 'İade miktarı eksi olamaz'; end if;

    if v_tur = 'satis' then
      select * into sk from public.satis_kalemleri where id = (k->>'kalem_id')::bigint and fatura_id = v_fatura;
      if not found then raise exception '%. kalem bu satışa ait değil', v_sira; end if;
      select sk.miktar - coalesce(sum(ik.miktar), 0) into v_kalan
        from public.iade_kalemleri ik join public.iadeler i on i.id = ik.iade_id
       where ik.satis_kalem_id = sk.id and i.durum = 'kayitli';
      select * into v_kart from public.stok_kartlari where id = sk.stok_karti_id;
      if v_miktar > v_kalan then
        raise exception '%: en fazla % iade edilebilir (satılan %, önceki iadeler düşüldü)', v_kart.ad, v_kalan, sk.miktar;
      end if;
      v_stoga := coalesce((k->>'stoga_al')::boolean, true);
      v_birim := sk.tutar / sk.miktar;
      v_tutar := round(v_birim * v_miktar, 2);
      v_kdv_t := round(v_tutar * sk.kdv_orani / 100, 2);
      v_bm := case when v_stoga then sk.birim_maliyet else 0 end;
      v_maliyet := round(v_bm * v_miktar, 2);
      insert into public.iade_kalemleri (iade_id, sira, satis_kalem_id, stok_karti_id, lot_no, miktar, birim_fiyat,
                                         kdv_orani, tutar, kdv_tutari, stoga_alindi, birim_maliyet, maliyet_tutari)
      values (v_id, v_sira, sk.id, sk.stok_karti_id, sk.lot_no, v_miktar, round(v_birim, 4),
              sk.kdv_orani, v_tutar, v_kdv_t, v_stoga, v_bm, v_maliyet);
      if v_stoga then
        insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, lot_no)
        values (v_tarih, sk.stok_karti_id, v_miktar, v_bm, v_maliyet, 'iade', v_id, sk.lot_no);
      end if;
    else
      select * into ak from public.alis_kalemleri where id = (k->>'kalem_id')::bigint and fatura_id = v_fatura;
      if not found then raise exception '%. kalem bu faturaya ait değil', v_sira; end if;
      if ak.stok_karti_id is null then raise exception '%. kalem bir gider kalemi; yalnız stok kalemleri iade edilir', v_sira; end if;
      select ak.miktar - coalesce(sum(ik.miktar), 0) into v_kalan
        from public.iade_kalemleri ik join public.iadeler i on i.id = ik.iade_id
       where ik.alis_kalem_id = ak.id and i.durum = 'kayitli';
      select * into v_kart from public.stok_kartlari where id = ak.stok_karti_id;
      if v_miktar > v_kalan then
        raise exception '%: en fazla % iade edilebilir (alınan %, önceki iadeler düşüldü)', v_kart.ad, v_kalan, ak.miktar;
      end if;
      v_birim := ak.tutar / ak.miktar;
      v_tutar := round(v_birim * v_miktar, 2);
      v_kdv_t := round(v_tutar * ak.kdv_orani / 100, 2);
      insert into public.iade_kalemleri (iade_id, sira, alis_kalem_id, stok_karti_id, miktar, birim_fiyat,
                                         kdv_orani, tutar, kdv_tutari, stoga_alindi, birim_maliyet, maliyet_tutari)
      values (v_id, v_sira, ak.id, ak.stok_karti_id, v_miktar, round(v_birim, 4),
              ak.kdv_orani, v_tutar, v_kdv_t, false, round(v_birim, 4), v_tutar);
      -- Stoktan, alıştaki net birim fiyatla çıkar.
      insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id)
      values (v_tarih, ak.stok_karti_id, -v_miktar, round(v_birim, 4), -v_tutar, 'iade', v_id);
    end if;
  end loop;

  if v_sira = 0 then raise exception 'İade edilecek miktar girilmedi'; end if;
  select sum(tutar), sum(kdv_tutari), sum(maliyet_tutari) into v_ara, v_kdv, v_mal from public.iade_kalemleri where iade_id = v_id;
  if v_ara + v_kdv <= 0 then raise exception 'İade toplamı sıfır olamaz'; end if;
  update public.iadeler set ara_toplam = v_ara, kdv_toplam = v_kdv, genel_toplam = v_ara + v_kdv,
                            maliyet_toplam = case when v_tur = 'satis' then v_mal else 0 end
   where id = v_id;

  with k as (select ik.*, s.kod as stok_kod, s.tur as stok_tur
               from public.iade_kalemleri ik join public.stok_kartlari s on s.id = ik.stok_karti_id
              where ik.iade_id = v_id),
  satirlar as (
    -- Satış iadesi
    select 1 as grup, '610' as hesap, sum(tutar) as borc, 0::numeric as alacak from k where v_tur = 'satis' having sum(tutar) > 0
    union all
    select 2, o.hesaplanan_kod, sum(k.kdv_tutari), 0 from k join public.kdv_oranlari o on o.oran = k.kdv_orani
     where v_tur = 'satis' and k.kdv_tutari > 0 group by o.hesaplanan_kod
    union all
    select 3, v_cari.kod, 0, v_ara + v_kdv where v_tur = 'satis'
    union all
    select 4, stok_kod, sum(maliyet_tutari), 0 from k where v_tur = 'satis' and maliyet_tutari > 0 group by stok_kod
    union all
    select 5, case when stok_tur = 'mamul' then '620.01' else '621' end, 0, sum(maliyet_tutari)
      from k where v_tur = 'satis' and maliyet_tutari > 0 group by 2
    -- Alış iadesi
    union all
    select 6, v_cari.kod, v_ara + v_kdv, 0 where v_tur = 'alis'
    union all
    select 7, stok_kod, 0, sum(tutar) from k where v_tur = 'alis' group by stok_kod
    union all
    select 8, o.indirilecek_kod, 0, sum(k.kdv_tutari) from k join public.kdv_oranlari o on o.oran = k.kdv_orani
     where v_tur = 'alis' and k.kdv_tutari > 0 group by o.indirilecek_kod
  )
  select jsonb_agg(jsonb_build_object('hesap_kodu', hesap, 'borc', borc, 'alacak', alacak) order by grup, hesap)
    into v_satirlar from satirlar;

  update public.iadeler
     set fis_id = public.fis_olustur(v_tarih,
                    case when v_tur = 'satis' then 'Satış iadesi İADE-' else 'Alış iadesi İADE-' end || v_no
                      || ' (' || v_fatura_no || ') · ' || v_cari.unvan,
                    'iade', v_id, v_satirlar)
   where id = v_id;

  -- Para iadesi: müşteriye ödeme / tedarikçiden tahsilat, iadeye bağlı.
  if v_odeme is not null then
    insert into public.para_hareketleri (tarih, tur, hesap_id, cari_id, tutar, belge_no, iade_id, aciklama)
    values (v_tarih, case when v_tur = 'satis' then 'odeme' else 'tahsilat' end::public.para_hareketi_turu,
            v_odeme, v_cari.id, v_ara + v_kdv, 'İADE-' || v_no, v_id, 'İade İADE-' || v_no)
    returning id into v_hareket;
    perform public.para_hareketi_fisle(v_hareket);
  end if;

  return v_id;
end;
$$;

create or replace function public.iade_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.iadeler; v_iptal uuid; r record;
begin
  select * into v from public.iadeler where id = p_id for update;
  if not found or v.durum <> 'kayitli' then raise exception 'İade bulunamadı veya zaten iptal'; end if;
  perform public.islem_izni_kontrol(v.tur);
  perform public.iptal_izni_kontrol('iadeler', p_id);
  if nullif(trim(p_neden), '') is null then raise exception 'İptal nedeni yazılmalı'; end if;

  insert into public.stok_hareketleri
    (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, iptal_edilen_hareket, lot_no, aciklama)
  select current_date, stok_karti_id, -miktar, birim_maliyet, -tutar, 'iptal', p_id, id, lot_no, 'İade iptali: ' || p_neden
    from public.stok_hareketleri where kaynak_tur = 'iade' and kaynak_id = p_id;

  v_iptal := public.fis_iptal(v.fis_id, 'İade iptali İADE-' || v.iade_no || ': ' || p_neden);

  perform set_config('imece.belge_iptali', 'evet', true);
  for r in select id from public.para_hareketleri where iade_id = p_id and durum = 'kayitli' loop
    perform public.para_hareketi_iptal(r.id, 'İade iptali: ' || p_neden);
  end loop;
  perform set_config('imece.belge_iptali', '', true);

  update public.iadeler set durum = 'iptal', iptal_nedeni = p_neden, iptal_fis_id = v_iptal where id = p_id;
end;
$$;

-- 6) Faturaya ya da iadeye bağlı para hareketi tek başına iptal edilemez.
create or replace function public.para_hareketi_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.para_hareketleri; v_iptal uuid;
begin
  perform public.islem_izni_kontrol('kasa'); perform public.iptal_izni_kontrol('para_hareketleri', p_id);
  select * into v from public.para_hareketleri where id = p_id for update;
  if not found or v.durum <> 'kayitli' then raise exception 'Kayıt bulunamadı veya zaten iptal'; end if;
  if (v.alis_fatura_id is not null or v.satis_fatura_id is not null or v.iade_id is not null)
     and current_setting('imece.belge_iptali', true) is distinct from 'evet' then
    raise exception 'Bu kayıt bir faturaya veya iadeye bağlı; o belgeyi iptal edin';
  end if;
  v_iptal := public.fis_iptal(v.fis_id, 'İptal: ' || coalesce(p_neden, ''));
  update public.para_hareketleri
     set durum = 'iptal', iptal_nedeni = p_neden, iptal_fis_id = v_iptal where id = p_id;
end;
$$;

-- 7) İptal izni kontrolüne iadeler eklendi.
create or replace function public.iptal_izni_kontrol(p_tablo text, p_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare v_olusturan uuid; v_zaman timestamptz;
begin
  if p_tablo not in ('para_hareketleri', 'alis_faturalari', 'satis_faturalari', 'uretim_partileri', 'sayimlar', 'yevmiye_fisleri', 'iadeler') then
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

-- Fatura iptali, kayıtlı iadesi varken yapılamaz (önce iadeler iptal edilir; aksi halde stok/cari çift düzelir).
create or replace function public.iadesi_olan_fatura_iptal_engeli()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.durum = 'iptal' and old.durum <> 'iptal' and exists (
       select 1 from public.iadeler
        where durum = 'kayitli'
          and (satis_fatura_id = new.id or alis_fatura_id = new.id)) then
    raise exception 'Bu faturanın kayıtlı iadesi var; önce iadeyi iptal edin';
  end if;
  return new;
end;
$$;
create trigger satis_iade_engeli before update on public.satis_faturalari
  for each row execute function public.iadesi_olan_fatura_iptal_engeli();
create trigger alis_iade_engeli before update on public.alis_faturalari
  for each row execute function public.iadesi_olan_fatura_iptal_engeli();

revoke execute on function public.iade_kaydet(jsonb) from public, anon;
revoke execute on function public.iade_iptal(uuid, text) from public, anon;
grant execute on function public.iade_kaydet(jsonb) to authenticated;
grant execute on function public.iade_iptal(uuid, text) to authenticated;
revoke execute on function public.iadesi_olan_fatura_iptal_engeli() from public, anon, authenticated;
