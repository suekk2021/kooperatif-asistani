-- Adım 2: kasa/banka hesapları, stok hareketleri, alış faturası, tahsilat/ödeme/virman.
-- Belgeler kullanıcı tarafından doğrudan yazılmaz; atomik fonksiyonlarla (alis_kaydet,
-- para_hareketi_kaydet, *_iptal) kaydedilir: belge + stok hareketi + muhasebe fişi ya
-- hep birlikte yazılır ya hiç yazılmaz. Silme yok; iptal ters kayıt üretir.

-- 1) Alt kod hane sayısı: cari/stok 3 hane (120.01.001), kasa/banka 2 hane (102.01)
drop function if exists public.sonraki_alt_kod(text);
create function public.sonraki_alt_kod(p_ust text, p_hane int default 3)
returns text language plpgsql security definer set search_path = public as $$
declare v_son int;
begin
  perform pg_advisory_xact_lock(hashtext('alt_kod:' || p_ust));
  select coalesce(max(substring(kod from length(p_ust) + 2)::int), 0) into v_son
    from public.hesap_plani
   where ust_kod = p_ust and substring(kod from length(p_ust) + 2) ~ '^[0-9]+$';
  return p_ust || '.' || lpad((v_son + 1)::text, p_hane, '0');
end;
$$;
revoke execute on function public.sonraki_alt_kod(text, int) from public, anon, authenticated;

-- 2) Kasa / banka / POS / şirket kredi kartı
create type public.para_hesabi_turu as enum ('kasa', 'banka', 'pos', 'kredi_karti');

create table public.kasa_banka_hesaplari (
  id uuid primary key default gen_random_uuid(),
  tur public.para_hesabi_turu not null,
  kod text not null unique references public.hesap_plani(kod),
  ad text not null check (length(trim(ad)) > 0),
  banka_adi text,
  iban text,
  bagli_banka_id uuid references public.kasa_banka_hesaplari(id),
  komisyon_orani numeric(5,2) check (komisyon_orani >= 0 and komisyon_orani < 100),
  aktif boolean not null default true,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index kasa_banka_ad_tekil on public.kasa_banka_hesaplari (public.ad_anahtari(ad)) where aktif;

create or replace function public.para_hesabi_kodu()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ust text := case new.tur when 'kasa' then '100' when 'banka' then '102'
                                   when 'pos' then '108' else '300' end;
begin
  if tg_op = 'INSERT' then
    if new.kod is null then
      new.kod := public.sonraki_alt_kod(v_ust, 2);
    elsif public.hesap_plani_ust(new.kod) is distinct from v_ust then
      raise exception 'Kod % bu hesap türü için % altında olmalı', new.kod, v_ust;
    end if;
    insert into public.hesap_plani (kod, ad) values (new.kod, new.ad) on conflict (kod) do nothing;
  else
    if new.kod <> old.kod or new.tur <> old.tur then
      raise exception 'Hesabın kodu ve türü değiştirilemez';
    end if;
    update public.hesap_plani set ad = new.ad, aktif = new.aktif
     where kod = new.kod and (ad <> new.ad or aktif <> new.aktif);
  end if;
  return new;
end;
$$;
create trigger kasa_banka_hesap before insert or update on public.kasa_banka_hesaplari
  for each row execute function public.para_hesabi_kodu();
create trigger kasa_banka_set_updated_at before update on public.kasa_banka_hesaplari
  for each row execute function public.set_updated_at();
create trigger kasa_banka_kayit after insert or update or delete on public.kasa_banka_hesaplari
  for each row execute function public.degisiklik_kaydet();

insert into public.kasa_banka_hesaplari (tur, kod, ad) values ('kasa', '100.01', 'Merkez Kasa');

-- 3) Stok hareketleri (+ giriş, − çıkış). Değer hareketli ortalama maliyetle tutulur:
--    çıkışta birim maliyet = o anki ortalama. Hareket silinmez/değişmez.
create table public.stok_hareketleri (
  id bigint generated always as identity primary key,
  tarih date not null,
  stok_karti_id uuid not null references public.stok_kartlari(id),
  miktar numeric(14,3) not null check (miktar <> 0),
  birim_maliyet numeric(14,4) not null check (birim_maliyet >= 0),
  tutar numeric(14,2) not null,
  kaynak_tur text not null check (kaynak_tur in
    ('alis', 'satis', 'uretim_girdi', 'uretim_cikti', 'sayim', 'acilis', 'iptal')),
  kaynak_id uuid,
  lot_no text,
  skt date,
  aciklama text,
  iptal_edilen_hareket bigint unique references public.stok_hareketleri(id),
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (tutar = 0 or sign(tutar) = sign(miktar))
);
create index stok_hareketleri_kart_idx on public.stok_hareketleri (stok_karti_id, tarih);
create index stok_hareketleri_kaynak_idx on public.stok_hareketleri (kaynak_tur, kaynak_id);
create trigger stok_hareketleri_kilit before update or delete on public.stok_hareketleri
  for each row execute function public.degistirilemez();
create trigger stok_hareketleri_donem before insert on public.stok_hareketleri
  for each row execute function public.fis_donem_kontrol();

create view public.stok_durumu with (security_invoker = true) as
select k.id as stok_karti_id,
       coalesce(sum(h.miktar), 0)::numeric(14,3) as miktar,
       coalesce(sum(h.tutar), 0)::numeric(14,2) as deger,
       case when coalesce(sum(h.miktar), 0) > 0
            then round(sum(h.tutar) / sum(h.miktar), 4) else 0 end::numeric(14,4) as ortalama_maliyet
  from public.stok_kartlari k
  left join public.stok_hareketleri h on h.stok_karti_id = k.id
 group by k.id;

-- 4) Alış faturası
create table public.alis_faturalari (
  id uuid primary key default gen_random_uuid(),
  cari_id uuid not null references public.cariler(id),
  belge_no text not null check (length(trim(belge_no)) > 0),
  tarih date not null,
  vade_tarihi date,
  aciklama text,
  ara_toplam numeric(14,2) not null,
  kdv_toplam numeric(14,2) not null,
  genel_toplam numeric(14,2) not null check (genel_toplam > 0),
  odeme_hesap_id uuid references public.kasa_banka_hesaplari(id),
  durum text not null default 'kayitli' check (durum in ('kayitli', 'iptal')),
  iptal_nedeni text,
  fis_id uuid references public.yevmiye_fisleri(id),
  iptal_fis_id uuid references public.yevmiye_fisleri(id),
  gorsel_yolu text,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (genel_toplam = ara_toplam + kdv_toplam)
);
-- Aynı tedarikçinin aynı fatura numarası ikinci kez girilemez (çift kayıt kaçağı).
create unique index alis_faturalari_tekil on public.alis_faturalari (cari_id, public.ad_anahtari(belge_no))
  where durum = 'kayitli';
create index alis_faturalari_tarih_idx on public.alis_faturalari (tarih desc);
create trigger alis_faturalari_kayit after insert or update on public.alis_faturalari
  for each row execute function public.degisiklik_kaydet();

-- Kalem ya stok kartıdır (hammadde, ambalaj…) ya da doğrudan gider/demirbaş hesabıdır
-- (elektrik 730, nakliye 760, kırtasiye 770, makine 253…).
create table public.alis_kalemleri (
  id bigint generated always as identity primary key,
  fatura_id uuid not null references public.alis_faturalari(id),
  sira smallint not null,
  stok_karti_id uuid references public.stok_kartlari(id),
  hesap_kodu text references public.hesap_plani(kod),
  aciklama text,
  miktar numeric(14,3) not null check (miktar > 0),
  birim_fiyat numeric(14,4) not null check (birim_fiyat >= 0),
  kdv_orani numeric(5,2) not null references public.kdv_oranlari(oran),
  tutar numeric(14,2) not null check (tutar >= 0),
  kdv_tutari numeric(14,2) not null check (kdv_tutari >= 0),
  check ((stok_karti_id is null) <> (hesap_kodu is null)),
  unique (fatura_id, sira)
);
create trigger alis_kalemleri_kilit before update or delete on public.alis_kalemleri
  for each row execute function public.degistirilemez();

-- 5) Tahsilat / ödeme / virman
create type public.para_hareketi_turu as enum ('tahsilat', 'odeme', 'virman');

create table public.para_hareketleri (
  id uuid primary key default gen_random_uuid(),
  tarih date not null,
  tur public.para_hareketi_turu not null,
  hesap_id uuid not null references public.kasa_banka_hesaplari(id),
  karsi_hesap_id uuid references public.kasa_banka_hesaplari(id),
  cari_id uuid references public.cariler(id),
  tutar numeric(14,2) not null check (tutar > 0),
  komisyon numeric(14,2) not null default 0 check (komisyon >= 0),
  aciklama text,
  belge_no text,
  alis_fatura_id uuid references public.alis_faturalari(id),
  durum text not null default 'kayitli' check (durum in ('kayitli', 'iptal')),
  iptal_nedeni text,
  fis_id uuid references public.yevmiye_fisleri(id),
  iptal_fis_id uuid references public.yevmiye_fisleri(id),
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check ((tur = 'virman') = (karsi_hesap_id is not null)),
  check (tur = 'virman' or cari_id is not null),
  check (karsi_hesap_id is null or karsi_hesap_id <> hesap_id),
  check (komisyon = 0 or (tur = 'virman' and komisyon < tutar))
);
create index para_hareketleri_tarih_idx on public.para_hareketleri (tarih desc);
create index para_hareketleri_cari_idx on public.para_hareketleri (cari_id);
create trigger para_hareketleri_kayit after insert or update on public.para_hareketleri
  for each row execute function public.degisiklik_kaydet();

-- Para hareketinin muhasebe fişi:
--   tahsilat: B kasa/banka  / A cari
--   ödeme:    B cari        / A kasa/banka/kredi kartı
--   virman:   B hedef (tutar − komisyon) + B 780 komisyon / A kaynak
create or replace function public.para_hareketi_fisle(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v public.para_hareketleri;
  v_hesap text; v_karsi text; v_cari text; v_cari_ad text; v_satirlar jsonb; v_aciklama text; v_fis uuid;
begin
  select * into v from public.para_hareketleri where id = p_id;
  select kod into v_hesap from public.kasa_banka_hesaplari where id = v.hesap_id;
  select kod into v_karsi from public.kasa_banka_hesaplari where id = v.karsi_hesap_id;
  select kod, unvan into v_cari, v_cari_ad from public.cariler where id = v.cari_id;

  if v.tur = 'tahsilat' then
    v_satirlar := jsonb_build_array(
      jsonb_build_object('hesap_kodu', v_hesap, 'borc', v.tutar),
      jsonb_build_object('hesap_kodu', v_cari, 'alacak', v.tutar));
    v_aciklama := 'Tahsilat · ' || v_cari_ad;
  elsif v.tur = 'odeme' then
    v_satirlar := jsonb_build_array(
      jsonb_build_object('hesap_kodu', v_cari, 'borc', v.tutar),
      jsonb_build_object('hesap_kodu', v_hesap, 'alacak', v.tutar));
    v_aciklama := 'Ödeme · ' || v_cari_ad;
  else
    v_satirlar := jsonb_build_array(jsonb_build_object('hesap_kodu', v_karsi, 'borc', v.tutar - v.komisyon));
    if v.komisyon > 0 then
      v_satirlar := v_satirlar || jsonb_build_array(
        jsonb_build_object('hesap_kodu', '780', 'borc', v.komisyon, 'aciklama', 'POS / banka komisyonu'));
    end if;
    v_satirlar := v_satirlar || jsonb_build_array(jsonb_build_object('hesap_kodu', v_hesap, 'alacak', v.tutar));
    v_aciklama := 'Virman';
  end if;

  if v.aciklama is not null then v_aciklama := v_aciklama || ' · ' || v.aciklama; end if;
  v_fis := public.fis_olustur(v.tarih, v_aciklama, v.tur::text, v.id, v_satirlar);
  update public.para_hareketleri set fis_id = v_fis where id = p_id;
  return v_fis;
end;
$$;

-- p: {"tur":"tahsilat|odeme|virman","tarih":"2026-11-10","hesap_id":"…","karsi_hesap_id":"…",
--     "cari_id":"…","tutar":1000,"komisyon":0,"aciklama":"…","belge_no":"…"}
create or replace function public.para_hareketi_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tur public.para_hareketi_turu := (p->>'tur')::public.para_hareketi_turu;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  if not exists (select 1 from public.kasa_banka_hesaplari where id = (p->>'hesap_id')::uuid and aktif) then
    raise exception 'Kasa/banka hesabı seçilmedi';
  end if;
  if v_tur <> 'virman' and not exists (select 1 from public.cariler where id = (p->>'cari_id')::uuid and aktif) then
    raise exception 'Cari seçilmedi';
  end if;

  insert into public.para_hareketleri
    (tarih, tur, hesap_id, karsi_hesap_id, cari_id, tutar, komisyon, aciklama, belge_no)
  values (coalesce((p->>'tarih')::date, current_date), v_tur, (p->>'hesap_id')::uuid,
          case when v_tur = 'virman' then (p->>'karsi_hesap_id')::uuid end,
          case when v_tur <> 'virman' then (p->>'cari_id')::uuid end,
          round((p->>'tutar')::numeric, 2),
          round(coalesce((p->>'komisyon')::numeric, 0), 2),
          nullif(trim(p->>'aciklama'), ''), nullif(trim(p->>'belge_no'), ''))
  returning id into v_id;

  perform public.para_hareketi_fisle(v_id);
  return v_id;
end;
$$;

create or replace function public.para_hareketi_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.para_hareketleri; v_iptal uuid;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  select * into v from public.para_hareketleri where id = p_id for update;
  if not found or v.durum <> 'kayitli' then raise exception 'Kayıt bulunamadı veya zaten iptal'; end if;
  if v.alis_fatura_id is not null and current_setting('imece.belge_iptali', true) is distinct from 'evet' then
    raise exception 'Bu ödeme bir alış faturasına bağlı; faturayı iptal edin';
  end if;
  v_iptal := public.fis_iptal(v.fis_id, 'İptal: ' || coalesce(p_neden, ''));
  update public.para_hareketleri
     set durum = 'iptal', iptal_nedeni = p_neden, iptal_fis_id = v_iptal where id = p_id;
end;
$$;

-- p: {"cari_id":"…","belge_no":"…","tarih":"…","vade_tarihi":"…","aciklama":"…",
--     "odeme_hesap_id": null (veresiye) | "…" (kasa/banka/kredi kartı ile peşin),
--     "kalemler":[{"stok_karti_id":"…"} veya {"hesap_kodu":"730"}, "aciklama","miktar","birim_fiyat","kdv_orani"]}
create or replace function public.alis_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_cari public.cariler; v_tarih date := coalesce((p->>'tarih')::date, current_date);
  v_ara numeric(14,2); v_kdv numeric(14,2); v_satirlar jsonb; v_odeme uuid; v_hareket uuid;
  k jsonb; v_sira int := 0; v_tutar numeric(14,2); v_kdv_t numeric(14,2);
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;

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
    (cari_id, belge_no, tarih, vade_tarihi, aciklama, ara_toplam, kdv_toplam, genel_toplam, odeme_hesap_id)
  values (v_cari.id, trim(p->>'belge_no'), v_tarih,
          coalesce((p->>'vade_tarihi')::date, case when v_odeme is null then v_tarih + v_cari.vade_gun end),
          -- Toplamlar kalemler yazıldıktan sonra güncellenir; buradaki 1/0/1 geçici.
          nullif(trim(p->>'aciklama'), ''), 1, 0, 1, v_odeme)
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

    v_tutar := round((k->>'miktar')::numeric * (k->>'birim_fiyat')::numeric, 2);
    v_kdv_t := round(v_tutar * coalesce((k->>'kdv_orani')::numeric, 0) / 100, 2);
    insert into public.alis_kalemleri
      (fatura_id, sira, stok_karti_id, hesap_kodu, aciklama, miktar, birim_fiyat, kdv_orani, tutar, kdv_tutari)
    values (v_id, v_sira, (k->>'stok_karti_id')::uuid,
            case when k->>'stok_karti_id' is null then k->>'hesap_kodu' end,
            nullif(trim(k->>'aciklama'), ''), (k->>'miktar')::numeric, (k->>'birim_fiyat')::numeric,
            coalesce((k->>'kdv_orani')::numeric, 0), v_tutar, v_kdv_t);
  end loop;

  select sum(tutar), sum(kdv_tutari) into v_ara, v_kdv from public.alis_kalemleri where fatura_id = v_id;
  if v_ara + v_kdv <= 0 then raise exception 'Fatura toplamı sıfır olamaz'; end if;
  -- Toplamlar kalemlerden hesaplanır; istemciden gelen toplama güvenilmez.
  update public.alis_faturalari set ara_toplam = v_ara, kdv_toplam = v_kdv, genel_toplam = v_ara + v_kdv where id = v_id;

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

  -- Peşin ödenen fatura: faturaya bağlı ödeme kaydı (cari ekstrede fatura + ödeme ayrı görünür).
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

create or replace function public.alis_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.alis_faturalari; v_iptal uuid; r record;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  if nullif(trim(p_neden), '') is null then raise exception 'İptal nedeni yazılmalı'; end if;
  select * into v from public.alis_faturalari where id = p_id for update;
  if not found or v.durum <> 'kayitli' then raise exception 'Fatura bulunamadı veya zaten iptal'; end if;

  insert into public.stok_hareketleri
    (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, iptal_edilen_hareket, aciklama)
  select current_date, stok_karti_id, -miktar, birim_maliyet, -tutar, 'iptal', p_id, id, 'Alış iptali: ' || p_neden
    from public.stok_hareketleri where kaynak_tur = 'alis' and kaynak_id = p_id;

  v_iptal := public.fis_iptal(v.fis_id, 'Alış iptali ' || v.belge_no || ': ' || p_neden);

  perform set_config('imece.belge_iptali', 'evet', true);
  for r in select id from public.para_hareketleri where alis_fatura_id = p_id and durum = 'kayitli' loop
    perform public.para_hareketi_iptal(r.id, 'Fatura iptali: ' || p_neden);
  end loop;
  perform set_config('imece.belge_iptali', '', true);

  update public.alis_faturalari
     set durum = 'iptal', iptal_nedeni = p_neden, iptal_fis_id = v_iptal where id = p_id;
end;
$$;

revoke execute on function public.para_hareketi_fisle(uuid) from public, anon, authenticated;
revoke execute on function public.para_hareketi_kaydet(jsonb) from public, anon;
revoke execute on function public.para_hareketi_iptal(uuid, text) from public, anon;
revoke execute on function public.alis_kaydet(jsonb) from public, anon;
revoke execute on function public.alis_iptal(uuid, text) from public, anon;
grant execute on function public.para_hareketi_kaydet(jsonb) to authenticated;
grant execute on function public.para_hareketi_iptal(uuid, text) to authenticated;
grant execute on function public.alis_kaydet(jsonb) to authenticated;
grant execute on function public.alis_iptal(uuid, text) to authenticated;

-- 6) Yetkiler: okuma giriş yapan herkes; kasa/banka hesabı açma izleyici hariç;
--    belgeler sadece yukarıdaki fonksiyonlarla yazılır.
alter table public.kasa_banka_hesaplari enable row level security;
alter table public.stok_hareketleri enable row level security;
alter table public.alis_faturalari enable row level security;
alter table public.alis_kalemleri enable row level security;
alter table public.para_hareketleri enable row level security;

create policy "Giris yapan okur" on public.kasa_banka_hesaplari for select using (auth.uid() is not null);
create policy "Izleyici disi ekler" on public.kasa_banka_hesaplari for insert with check (public.yazabilir());
create policy "Izleyici disi duzenler" on public.kasa_banka_hesaplari for update using (public.yazabilir());
create policy "Giris yapan okur" on public.stok_hareketleri for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.alis_faturalari for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.alis_kalemleri for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.para_hareketleri for select using (auth.uid() is not null);
