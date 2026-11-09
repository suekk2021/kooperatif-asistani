-- Adım 3: satış faturası. Tek kayıtta: stok çıkışı (ortalama maliyetle), müşteri alacağı
-- (120), satış (600.01), hesaplanan KDV (391), satılan malın maliyeti (620.01 / 621 ←
-- 152 / 153). Peşin satışta tahsilat ayrıca kaydolur (kasa, banka veya POS 108).
--
-- Stokta olmayan ürün satılabilir (üretim modülü gelene kadar mamul stoğu hep sıfır
-- görünecek; satışı engellemek ekranı kullanılmaz yapardı). O durumda maliyet son bilinen
-- giriş maliyetinden, o da yoksa sıfır alınır ve kalem "maliyet_tahmini" diye işaretlenir.

create table public.satis_faturalari (
  id uuid primary key default gen_random_uuid(),
  satis_no bigint generated always as identity unique,
  cari_id uuid not null references public.cariler(id),
  belge_no text,
  tarih date not null,
  vade_tarihi date,
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
  check (genel_toplam = ara_toplam + kdv_toplam)
);
create unique index satis_faturalari_belge_tekil on public.satis_faturalari (public.ad_anahtari(belge_no))
  where durum = 'kayitli' and belge_no is not null;
create index satis_faturalari_tarih_idx on public.satis_faturalari (tarih desc);
create index satis_faturalari_cari_idx on public.satis_faturalari (cari_id);
create trigger satis_faturalari_kayit after insert or update on public.satis_faturalari
  for each row execute function public.degisiklik_kaydet();

create table public.satis_kalemleri (
  id bigint generated always as identity primary key,
  fatura_id uuid not null references public.satis_faturalari(id),
  sira smallint not null,
  stok_karti_id uuid not null references public.stok_kartlari(id),
  lot_no text,
  miktar numeric(14,3) not null check (miktar > 0),
  birim_fiyat numeric(14,4) not null check (birim_fiyat >= 0),
  kdv_orani numeric(5,2) not null references public.kdv_oranlari(oran),
  tutar numeric(14,2) not null check (tutar >= 0),
  kdv_tutari numeric(14,2) not null check (kdv_tutari >= 0),
  birim_maliyet numeric(14,4) not null default 0,
  maliyet_tutari numeric(14,2) not null default 0,
  maliyet_tahmini boolean not null default false,
  unique (fatura_id, sira)
);
create trigger satis_kalemleri_kilit before update or delete on public.satis_kalemleri
  for each row execute function public.degistirilemez();

alter table public.para_hareketleri add column satis_fatura_id uuid references public.satis_faturalari(id);

-- Bir stok kartının şu anki birim maliyeti: stok varsa ortalama, yoksa son giriş
-- maliyeti, o da yoksa 0. İkinci değer: tahmini mi (stok yetersizdi)?
create or replace function public.guncel_birim_maliyet(p_kart uuid, p_miktar numeric, out maliyet numeric, out tahmini boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_miktar numeric; v_deger numeric;
begin
  select coalesce(sum(miktar), 0), coalesce(sum(tutar), 0) into v_miktar, v_deger
    from public.stok_hareketleri where stok_karti_id = p_kart;
  if v_miktar > 0 then
    maliyet := round(v_deger / v_miktar, 4);
  else
    select birim_maliyet into maliyet from public.stok_hareketleri
     where stok_karti_id = p_kart and miktar > 0 and kaynak_tur <> 'iptal'
     order by tarih desc, id desc limit 1;
    maliyet := coalesce(maliyet, 0);
  end if;
  tahmini := v_miktar < p_miktar;
end;
$$;
revoke execute on function public.guncel_birim_maliyet(uuid, numeric) from public, anon;
grant execute on function public.guncel_birim_maliyet(uuid, numeric) to authenticated;

-- p: {"cari_id","belge_no","tarih","vade_tarihi","aciklama","odeme_hesap_id": null|"…",
--     "kalemler":[{"stok_karti_id","lot_no","miktar","birim_fiyat","kdv_orani"}]}
create or replace function public.satis_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_cari public.cariler; v_tarih date := coalesce((p->>'tarih')::date, current_date);
  v_odeme uuid; v_hareket uuid; v_ara numeric(14,2); v_kdv numeric(14,2); v_maliyet numeric(14,2);
  v_satirlar jsonb; k jsonb; v_sira int := 0; v_kart public.stok_kartlari;
  v_tutar numeric(14,2); v_kdv_t numeric(14,2); v_bm numeric; v_tahmini boolean; v_no bigint;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;

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
    (cari_id, belge_no, tarih, vade_tarihi, aciklama, ara_toplam, kdv_toplam, genel_toplam, odeme_hesap_id)
  values (v_cari.id, nullif(trim(p->>'belge_no'), ''), v_tarih,
          coalesce((p->>'vade_tarihi')::date, case when v_odeme is null then v_tarih + v_cari.vade_gun end),
          -- Toplamlar kalemler yazıldıktan sonra güncellenir; buradaki 1/0/1 geçici.
          nullif(trim(p->>'aciklama'), ''), 1, 0, 1, v_odeme)
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

    v_tutar := round((k->>'miktar')::numeric * (k->>'birim_fiyat')::numeric, 2);
    v_kdv_t := round(v_tutar * coalesce((k->>'kdv_orani')::numeric, 0) / 100, 2);
    select maliyet, tahmini into v_bm, v_tahmini from public.guncel_birim_maliyet(v_kart.id, (k->>'miktar')::numeric);

    insert into public.satis_kalemleri
      (fatura_id, sira, stok_karti_id, lot_no, miktar, birim_fiyat, kdv_orani, tutar, kdv_tutari,
       birim_maliyet, maliyet_tutari, maliyet_tahmini)
    values (v_id, v_sira, v_kart.id, nullif(trim(k->>'lot_no'), ''), (k->>'miktar')::numeric,
            (k->>'birim_fiyat')::numeric, coalesce((k->>'kdv_orani')::numeric, 0), v_tutar, v_kdv_t,
            v_bm, round(v_bm * (k->>'miktar')::numeric, 2), v_tahmini);

    -- Aynı faturada aynı ürün iki satırda olabilir; her satır anında stoktan düşer ki
    -- ikinci satırın maliyeti güncel stoktan hesaplansın.
    insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, lot_no)
    values (v_tarih, v_kart.id, -(k->>'miktar')::numeric, v_bm, -round(v_bm * (k->>'miktar')::numeric, 2),
            'satis', v_id, nullif(trim(k->>'lot_no'), ''));
  end loop;

  select sum(tutar), sum(kdv_tutari), sum(maliyet_tutari) into v_ara, v_kdv, v_maliyet
    from public.satis_kalemleri where fatura_id = v_id;
  if v_ara + v_kdv <= 0 then raise exception 'Satış toplamı sıfır olamaz'; end if;
  update public.satis_faturalari
     set ara_toplam = v_ara, kdv_toplam = v_kdv, genel_toplam = v_ara + v_kdv, maliyet_toplam = v_maliyet
   where id = v_id;

  -- Fiş: B müşteri / A 600.01 + A 391.xx ; B 620.01|621 / A 152.xx|153.xx (maliyet)
  with k as (select sk.*, s.kod as stok_kod, s.tur as stok_tur
               from public.satis_kalemleri sk join public.stok_kartlari s on s.id = sk.stok_karti_id
              where sk.fatura_id = v_id),
  satirlar as (
    select 1 as grup, v_cari.kod as hesap, v_ara + v_kdv as borc, 0::numeric as alacak
    union all
    select 2, '600.01', 0, sum(tutar) from k having sum(tutar) > 0
    union all
    select 3, o.hesaplanan_kod, 0, sum(k.kdv_tutari) from k join public.kdv_oranlari o on o.oran = k.kdv_orani
     where k.kdv_tutari > 0 group by o.hesaplanan_kod
    union all
    select 4, case when stok_tur = 'mamul' then '620.01' else '621' end, sum(maliyet_tutari), 0
      from k where maliyet_tutari > 0 group by 2
    union all
    select 5, stok_kod, 0, sum(maliyet_tutari) from k where maliyet_tutari > 0 group by stok_kod
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

create or replace function public.satis_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.satis_faturalari; v_iptal uuid; r record;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  if nullif(trim(p_neden), '') is null then raise exception 'İptal nedeni yazılmalı'; end if;
  select * into v from public.satis_faturalari where id = p_id for update;
  if not found or v.durum <> 'kayitli' then raise exception 'Satış bulunamadı veya zaten iptal'; end if;

  insert into public.stok_hareketleri
    (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, iptal_edilen_hareket, lot_no, aciklama)
  select current_date, stok_karti_id, -miktar, birim_maliyet, -tutar, 'iptal', p_id, id, lot_no, 'Satış iptali: ' || p_neden
    from public.stok_hareketleri where kaynak_tur = 'satis' and kaynak_id = p_id;

  v_iptal := public.fis_iptal(v.fis_id, 'Satış iptali SAT-' || v.satis_no || ': ' || p_neden);

  perform set_config('imece.belge_iptali', 'evet', true);
  for r in select id from public.para_hareketleri where satis_fatura_id = p_id and durum = 'kayitli' loop
    perform public.para_hareketi_iptal(r.id, 'Satış iptali: ' || p_neden);
  end loop;
  perform set_config('imece.belge_iptali', '', true);

  update public.satis_faturalari
     set durum = 'iptal', iptal_nedeni = p_neden, iptal_fis_id = v_iptal where id = p_id;
end;
$$;

-- Faturaya bağlı tahsilat/ödeme tek başına iptal edilemez (alış veya satış).
create or replace function public.para_hareketi_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.para_hareketleri; v_iptal uuid;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  select * into v from public.para_hareketleri where id = p_id for update;
  if not found or v.durum <> 'kayitli' then raise exception 'Kayıt bulunamadı veya zaten iptal'; end if;
  if (v.alis_fatura_id is not null or v.satis_fatura_id is not null)
     and current_setting('imece.belge_iptali', true) is distinct from 'evet' then
    raise exception 'Bu kayıt bir faturaya bağlı; faturayı iptal edin';
  end if;
  v_iptal := public.fis_iptal(v.fis_id, 'İptal: ' || coalesce(p_neden, ''));
  update public.para_hareketleri
     set durum = 'iptal', iptal_nedeni = p_neden, iptal_fis_id = v_iptal where id = p_id;
end;
$$;

revoke execute on function public.satis_kaydet(jsonb) from public, anon;
revoke execute on function public.satis_iptal(uuid, text) from public, anon;
grant execute on function public.satis_kaydet(jsonb) to authenticated;
grant execute on function public.satis_iptal(uuid, text) to authenticated;

alter table public.satis_faturalari enable row level security;
alter table public.satis_kalemleri enable row level security;
create policy "Giris yapan okur" on public.satis_faturalari for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.satis_kalemleri for select using (auth.uid() is not null);
