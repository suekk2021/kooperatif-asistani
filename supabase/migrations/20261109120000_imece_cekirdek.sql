-- İMECE çekirdeği: hesap planı, cariler, stok kartları, KDV, depolar,
-- yevmiye fişleri (borç = alacak veritabanında zorunlu), dönem kilidi,
-- değişiklik kaydı.
--
-- Muhasebeci kararları (9 Kasım 2026): 7/A maliyet sistemi; kartlı satış 108,
-- POS komisyonu 780; şirket kredi kartı 300 alt hesabı; müşteri 120, tedarikçi
-- 320; cari kodu = muhasebe kodu (ayrı cari kodu yok); fire için eşik yok,
-- 689'a ayırma kararı muhasebecide (sistem otomatik ayırmaz).

-- 1) Eski ön muhasebe kaldırılıyor. Az kullanıldı (18 işlem, 1 müşteri);
--    yedek: yedek/2026-11-09_islemler.json, yedek/2026-11-09_musteriler.json
drop table if exists public.islemler cascade;
drop table if exists public.musteriler cascade;
drop type if exists public.islem_turu;

-- 2) Yardımcılar
create or replace function public.yazabilir()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol <> 'izleyici');
$$;

create or replace function public.baskan_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol = 'baskan');
$$;

-- "Ceviz içi" / "ceviz  ici " / "CEVİZ İÇİ" aynı kart sayılsın diye karşılaştırma
-- anahtarı. Türkçe I/İ, sunucu dil ayarından bağımsız elle çevriliyor.
create or replace function public.ad_anahtari(p text)
returns text language sql immutable as $$
  select lower(translate(regexp_replace(trim(p), '\s+', ' ', 'g'), 'İIÇĞÖŞÜ', 'iıçğöşü'));
$$;

-- 3) Hesap planı
create table public.hesap_plani (
  kod text primary key check (kod ~ '^[0-9]{3}(\.[0-9]{2,4})*$'),
  ad text not null check (length(trim(ad)) > 0),
  ust_kod text generated always as (
    case when position('.' in kod) = 0 then null
         else regexp_replace(kod, '\.[0-9]+$', '') end
  ) stored references public.hesap_plani(kod),
  aciklama text,
  aktif boolean not null default true,
  sistem boolean not null default false,
  created_at timestamptz not null default now()
);
create index hesap_plani_ust_kod_idx on public.hesap_plani (ust_kod);

-- Bir üst hesabın altında sıradaki boş kodu verir: 120.01 -> 120.01.001, .002 ...
create or replace function public.sonraki_alt_kod(p_ust text)
returns text language plpgsql security definer set search_path = public as $$
declare v_son int;
begin
  perform pg_advisory_xact_lock(hashtext('alt_kod:' || p_ust));
  select coalesce(max(substring(kod from length(p_ust) + 2)::int), 0) into v_son
    from public.hesap_plani
   where ust_kod = p_ust and substring(kod from length(p_ust) + 2) ~ '^[0-9]+$';
  return p_ust || '.' || lpad((v_son + 1)::text, 3, '0');
end;
$$;

-- Tek Düzen Hesap Planı: programın kullandığı ana hesaplar + grup alt hesapları.
-- Cari, stok, kasa/banka alt hesapları kart açılınca otomatik eklenir.
insert into public.hesap_plani (kod, ad, aciklama, sistem) values
  ('100', 'Kasa', 'Elde tutulan nakit', true),
  ('101', 'Alınan Çekler', 'Müşteriden alınıp henüz tahsil edilmemiş çekler', true),
  ('102', 'Bankalar', 'Banka hesapları, her hesap ayrı alt hesap', true),
  ('103', 'Verilen Çekler ve Ödeme Emirleri (-)', 'Yazılan, ödenmemiş çekler', true),
  ('108', 'Diğer Hazır Değerler', 'Kartlı satışta POS''ta bekleyen para', true),
  ('120', 'Alıcılar', 'Veresiye satılan müşteriler', true),
  ('121', 'Alacak Senetleri', 'Müşteriden alınan senetler', true),
  ('150', 'İlk Madde ve Malzeme', 'Hammadde ve ambalaj', true),
  ('151', 'Yarı Mamuller - Üretim', 'Üretimi bitmemiş ürün', true),
  ('152', 'Mamuller', 'Üretilen, satışa hazır ürün', true),
  ('153', 'Ticari Mallar', 'Üretmeden alınıp satılan mal', true),
  ('190', 'Devreden KDV', null, true),
  ('191', 'İndirilecek KDV', 'Alışta ödenen KDV', true),
  ('195', 'İş Avansları', null, true),
  ('196', 'Personel Avansları', null, true),
  ('253', 'Tesis, Makine ve Cihazlar', null, true),
  ('254', 'Taşıtlar', null, true),
  ('255', 'Demirbaşlar', null, true),
  ('257', 'Birikmiş Amortismanlar (-)', null, true),
  ('300', 'Banka Kredileri', 'Kredi ve şirket kredi kartı (alt hesap)', true),
  ('320', 'Satıcılar', 'Veresiye alınan tedarikçiler', true),
  ('321', 'Borç Senetleri', null, true),
  ('331', 'Ortaklara Borçlar', null, true),
  ('335', 'Personele Borçlar', null, true),
  ('340', 'Alınan Sipariş Avansları', null, true),
  ('360', 'Ödenecek Vergi ve Fonlar', null, true),
  ('361', 'Ödenecek Sosyal Güvenlik Kesintileri', null, true),
  ('391', 'Hesaplanan KDV', 'Satışta alınan KDV', true),
  ('500', 'Sermaye', null, true),
  ('600', 'Yurtiçi Satışlar', null, true),
  ('602', 'Diğer Gelirler', null, true),
  ('610', 'Satıştan İadeler (-)', null, true),
  ('611', 'Satış İskontoları (-)', null, true),
  ('620', 'Satılan Mamuller Maliyeti (-)', null, true),
  ('621', 'Satılan Ticari Mallar Maliyeti (-)', null, true),
  ('710', 'Direkt İlk Madde ve Malzeme Giderleri', null, true),
  ('711', 'Direkt İlk Madde ve Malzeme Yansıtma', null, true),
  ('720', 'Direkt İşçilik Giderleri', null, true),
  ('721', 'Direkt İşçilik Giderleri Yansıtma', null, true),
  ('730', 'Genel Üretim Giderleri', null, true),
  ('731', 'Genel Üretim Giderleri Yansıtma', null, true),
  ('760', 'Pazarlama Satış ve Dağıtım Giderleri', null, true),
  ('761', 'Pazarlama Satış ve Dağıtım Giderleri Yansıtma', null, true),
  ('770', 'Genel Yönetim Giderleri', null, true),
  ('771', 'Genel Yönetim Giderleri Yansıtma', null, true),
  ('780', 'Finansman Giderleri', 'Kredi faizi, banka masrafı, POS komisyonu', true),
  ('781', 'Finansman Giderleri Yansıtma', null, true);

insert into public.hesap_plani (kod, ad, sistem) values
  ('100.01', 'Merkez Kasa', true),
  ('120.01', 'Yurtiçi Alıcılar', true),
  ('320.01', 'Yurtiçi Satıcılar', true),
  ('150.01', 'Hammaddeler', true),
  ('150.02', 'Ambalaj Malzemeleri', true),
  ('151.01', 'Yarı Mamuller', true),
  ('152.01', 'Mamuller', true),
  ('153.01', 'Ticari Mallar', true),
  ('191.01', 'İndirilecek KDV %1', true),
  ('191.10', 'İndirilecek KDV %10', true),
  ('191.20', 'İndirilecek KDV %20', true),
  ('391.01', 'Hesaplanan KDV %1', true),
  ('391.10', 'Hesaplanan KDV %10', true),
  ('391.20', 'Hesaplanan KDV %20', true),
  ('600.01', 'Donuk Hamur İşleri Satışları', true),
  ('620.01', 'Satılan Mamuller Maliyeti', true);

-- 4) KDV oranları ve depolar
create table public.kdv_oranlari (
  oran numeric(5,2) primary key check (oran >= 0 and oran < 100),
  indirilecek_kod text references public.hesap_plani(kod),
  hesaplanan_kod text references public.hesap_plani(kod),
  aktif boolean not null default true,
  check (oran = 0 or (indirilecek_kod is not null and hesaplanan_kod is not null))
);
insert into public.kdv_oranlari (oran, indirilecek_kod, hesaplanan_kod) values
  (0, null, null),
  (1, '191.01', '391.01'),
  (10, '191.10', '391.10'),
  (20, '191.20', '391.20');

create table public.depolar (
  id smallint generated always as identity primary key,
  ad text not null unique,
  aciklama text,
  aktif boolean not null default true
);
insert into public.depolar (ad, aciklama) values
  ('Kuru depo', 'Un, yağ, ambalaj'),
  ('Soğuk depo', '-18°C, donuk ürün ve soğuk hammadde');

-- 5) Cariler (müşteri / tedarikçi). Kod = muhasebe alt hesabı (120.01.001 ...)
create type public.cari_turu as enum ('musteri', 'tedarikci');

create table public.cariler (
  id uuid primary key default gen_random_uuid(),
  tur public.cari_turu not null,
  kod text not null unique references public.hesap_plani(kod),
  unvan text not null check (length(trim(unvan)) > 0),
  vergi_no text,
  vergi_dairesi text,
  telefon text,
  eposta text,
  adres text,
  iban text,
  vade_gun integer not null default 0 check (vade_gun >= 0),
  notlar text,
  aktif boolean not null default true,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index cariler_unvan_tekil on public.cariler (tur, public.ad_anahtari(unvan)) where aktif;

-- 6) Stok kartları. Kod = muhasebe alt hesabı (150.01.001 ...)
create type public.stok_turu as enum ('hammadde', 'ambalaj', 'yari_mamul', 'mamul', 'ticari_mal');

create table public.stok_kartlari (
  id uuid primary key default gen_random_uuid(),
  tur public.stok_turu not null,
  kod text not null unique references public.hesap_plani(kod),
  ad text not null check (length(trim(ad)) > 0),
  birim text not null check (birim in ('kg', 'g', 'lt', 'adet', 'paket', 'koli')),
  depo_id smallint references public.depolar(id),
  kdv_orani numeric(5,2) not null default 1 references public.kdv_oranlari(oran),
  min_stok numeric(14,3) check (min_stok >= 0),
  notlar text,
  aktif boolean not null default true,
  birlestirildigi_kart uuid references public.stok_kartlari(id),
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index stok_kartlari_ad_tekil on public.stok_kartlari (public.ad_anahtari(ad))
  where aktif and birlestirildigi_kart is null;

create or replace function public.stok_ust_kodu(p_tur public.stok_turu)
returns text language sql immutable as $$
  select case p_tur
    when 'hammadde' then '150.01'
    when 'ambalaj' then '150.02'
    when 'yari_mamul' then '151.01'
    when 'mamul' then '152.01'
    when 'ticari_mal' then '153.01'
  end;
$$;

-- Kart açılınca alt hesabı otomatik açar; kart adı değişince hesap adı da değişir.
-- Kod ve tür sonradan değiştirilemez (muhasebe kaydı o koda bağlı).
create or replace function public.kart_hesabi_ac()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ad text; v_ust text;
begin
  if tg_table_name = 'cariler' then
    v_ad := new.unvan;
    v_ust := case new.tur when 'musteri' then '120.01' else '320.01' end;
  else
    v_ad := new.ad;
    v_ust := public.stok_ust_kodu(new.tur);
  end if;

  if tg_op = 'INSERT' then
    if new.kod is null then
      new.kod := public.sonraki_alt_kod(v_ust);
    elsif public.hesap_plani_ust(new.kod) is distinct from v_ust then
      raise exception 'Kod % bu kart türü için % altında olmalı', new.kod, v_ust;
    end if;
    insert into public.hesap_plani (kod, ad) values (new.kod, v_ad)
      on conflict (kod) do nothing;
  else
    if new.kod <> old.kod or new.tur <> old.tur then
      raise exception 'Kartın kodu ve türü değiştirilemez';
    end if;
    update public.hesap_plani set ad = v_ad, aktif = new.aktif
     where kod = new.kod and (ad <> v_ad or aktif <> new.aktif);
  end if;
  return new;
end;
$$;

create or replace function public.hesap_plani_ust(p_kod text)
returns text language sql immutable as $$
  select case when position('.' in p_kod) = 0 then null
              else regexp_replace(p_kod, '\.[0-9]+$', '') end;
$$;

create trigger cariler_hesap before insert or update on public.cariler
  for each row execute function public.kart_hesabi_ac();
create trigger stok_kartlari_hesap before insert or update on public.stok_kartlari
  for each row execute function public.kart_hesabi_ac();

create trigger cariler_set_updated_at before update on public.cariler
  for each row execute function public.set_updated_at();
create trigger stok_kartlari_set_updated_at before update on public.stok_kartlari
  for each row execute function public.set_updated_at();

-- 7) Dönem kilidi: kapatılan ayın tarihine yeni fiş kesilemez
create table public.kapali_donemler (
  donem date primary key check (donem = date_trunc('month', donem)::date),
  kapatan uuid references public.profiller(id) default auth.uid(),
  kapatma_zamani timestamptz not null default now()
);

-- 8) Yevmiye. Fiş ve satırları değiştirilmez/silinmez; düzeltme ters fişle yapılır.
create table public.yevmiye_fisleri (
  id uuid primary key default gen_random_uuid(),
  fis_no bigint generated always as identity unique,
  tarih date not null,
  aciklama text not null,
  kaynak_tur text not null check (kaynak_tur in
    ('acilis', 'alis', 'satis', 'uretim', 'tahsilat', 'odeme', 'virman', 'sayim', 'manuel', 'iptal')),
  kaynak_id uuid,
  iptal_edilen_fis uuid unique references public.yevmiye_fisleri(id),
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check ((kaynak_tur = 'iptal') = (iptal_edilen_fis is not null))
);
create index yevmiye_fisleri_tarih_idx on public.yevmiye_fisleri (tarih);
create index yevmiye_fisleri_kaynak_idx on public.yevmiye_fisleri (kaynak_tur, kaynak_id);

create table public.yevmiye_satirlari (
  id bigint generated always as identity primary key,
  fis_id uuid not null references public.yevmiye_fisleri(id),
  sira smallint not null,
  hesap_kodu text not null references public.hesap_plani(kod),
  borc numeric(14,2) not null default 0 check (borc >= 0),
  alacak numeric(14,2) not null default 0 check (alacak >= 0),
  aciklama text,
  check ((borc > 0) <> (alacak > 0)),
  unique (fis_id, sira)
);
create index yevmiye_satirlari_hesap_idx on public.yevmiye_satirlari (hesap_kodu);

create or replace function public.degistirilemez()
returns trigger language plpgsql as $$
begin
  raise exception 'Muhasebe fişleri değiştirilemez veya silinemez; düzeltme için iptal (ters) fişi kesin';
end;
$$;
create trigger yevmiye_fisleri_kilit before update or delete on public.yevmiye_fisleri
  for each row execute function public.degistirilemez();
create trigger yevmiye_satirlari_kilit before update or delete on public.yevmiye_satirlari
  for each row execute function public.degistirilemez();

create or replace function public.fis_donem_kontrol()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.kapali_donemler where donem = date_trunc('month', new.tarih)::date) then
    raise exception '% dönemi kapatılmış; bu tarihe fiş kesilemez', to_char(new.tarih, 'MM.YYYY');
  end if;
  return new;
end;
$$;
create trigger yevmiye_fisleri_donem before insert on public.yevmiye_fisleri
  for each row execute function public.fis_donem_kontrol();

-- Kayıt sadece en alt (alt hesabı olmayan) ve aktif hesaba yapılır.
create or replace function public.satir_hesap_kontrol()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.hesap_plani where kod = new.hesap_kodu and aktif) then
    raise exception 'Hesap % yok veya pasif', new.hesap_kodu;
  end if;
  if exists (select 1 from public.hesap_plani where ust_kod = new.hesap_kodu) then
    raise exception 'Hesap % alt hesapları olan bir grup hesabı; alt hesaba kayıt yapılmalı', new.hesap_kodu;
  end if;
  return new;
end;
$$;
create trigger yevmiye_satirlari_hesap before insert on public.yevmiye_satirlari
  for each row execute function public.satir_hesap_kontrol();

-- Borç = alacak kontrolü işlem (transaction) sonunda yapılır: fiş ve satırları
-- birlikte yazılır, denge tutmazsa hepsi geri alınır.
create or replace function public.fis_dengesi(p_fis uuid)
returns void language plpgsql as $$
declare v_borc numeric; v_alacak numeric; v_adet int;
begin
  select coalesce(sum(borc), 0), coalesce(sum(alacak), 0), count(*)
    into v_borc, v_alacak, v_adet
    from public.yevmiye_satirlari where fis_id = p_fis;
  if v_adet < 2 then
    raise exception 'Fişte en az iki satır olmalı';
  end if;
  if v_borc <> v_alacak then
    raise exception 'Fiş dengesiz: borç % / alacak %', v_borc, v_alacak;
  end if;
end;
$$;

create or replace function public.fis_dengesi_fis()
returns trigger language plpgsql as $$
begin
  perform public.fis_dengesi(new.id);
  return null;
end;
$$;
create or replace function public.fis_dengesi_satir()
returns trigger language plpgsql as $$
begin
  perform public.fis_dengesi(new.fis_id);
  return null;
end;
$$;
create constraint trigger yevmiye_fisleri_denge after insert on public.yevmiye_fisleri
  deferrable initially deferred for each row execute function public.fis_dengesi_fis();
create constraint trigger yevmiye_satirlari_denge after insert on public.yevmiye_satirlari
  deferrable initially deferred for each row execute function public.fis_dengesi_satir();

-- Fiş kesme ve iptal: sadece sunucu tarafındaki belge fonksiyonları (alış, satış,
-- üretim...) çağırır; kullanıcı doğrudan çağıramaz (aşağıda revoke).
-- p_satirlar: [{"hesap_kodu":"150.01.001","borc":100,"alacak":0,"aciklama":"..."}]
create or replace function public.fis_olustur(
  p_tarih date, p_aciklama text, p_kaynak_tur text, p_kaynak_id uuid, p_satirlar jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_fis uuid;
begin
  insert into public.yevmiye_fisleri (tarih, aciklama, kaynak_tur, kaynak_id, olusturan)
  values (p_tarih, p_aciklama, p_kaynak_tur, p_kaynak_id, auth.uid())
  returning id into v_fis;

  insert into public.yevmiye_satirlari (fis_id, sira, hesap_kodu, borc, alacak, aciklama)
  select v_fis, s.ord, s.e->>'hesap_kodu',
         round(coalesce((s.e->>'borc')::numeric, 0), 2),
         round(coalesce((s.e->>'alacak')::numeric, 0), 2),
         s.e->>'aciklama'
    from jsonb_array_elements(p_satirlar) with ordinality as s(e, ord);

  return v_fis;
end;
$$;

create or replace function public.fis_iptal(p_fis uuid, p_aciklama text, p_tarih date default current_date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_yeni uuid; v_eski public.yevmiye_fisleri;
begin
  select * into v_eski from public.yevmiye_fisleri where id = p_fis;
  if not found then raise exception 'Fiş bulunamadı'; end if;
  if v_eski.kaynak_tur = 'iptal' then raise exception 'İptal fişi tekrar iptal edilemez'; end if;

  insert into public.yevmiye_fisleri (tarih, aciklama, kaynak_tur, kaynak_id, iptal_edilen_fis, olusturan)
  values (p_tarih, p_aciklama, 'iptal', v_eski.kaynak_id, p_fis, auth.uid())
  returning id into v_yeni;

  insert into public.yevmiye_satirlari (fis_id, sira, hesap_kodu, borc, alacak, aciklama)
  select v_yeni, sira, hesap_kodu, alacak, borc, aciklama
    from public.yevmiye_satirlari where fis_id = p_fis;

  return v_yeni;
end;
$$;

revoke execute on function public.fis_olustur(date, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.fis_iptal(uuid, text, date) from public, anon, authenticated;
revoke execute on function public.sonraki_alt_kod(text) from public, anon, authenticated;

-- 9) Değişiklik kaydı (kim, neyi, ne zaman, eski/yeni hali)
create table public.degisiklik_kaydi (
  id bigint generated always as identity primary key,
  tablo text not null,
  kayit text,
  islem text not null,
  eski jsonb,
  yeni jsonb,
  kullanici uuid default auth.uid(),
  zaman timestamptz not null default now()
);
create index degisiklik_kaydi_kayit_idx on public.degisiklik_kaydi (tablo, kayit);

create or replace function public.degisiklik_kaydet()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_satir jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.degisiklik_kaydi (tablo, kayit, islem, eski, yeni)
  values (tg_table_name,
          coalesce(v_satir->>'id', v_satir->>'kod', v_satir->>'oran', v_satir->>'donem'),
          tg_op,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

create trigger hesap_plani_kayit after insert or update or delete on public.hesap_plani
  for each row execute function public.degisiklik_kaydet();
create trigger cariler_kayit after insert or update or delete on public.cariler
  for each row execute function public.degisiklik_kaydet();
create trigger stok_kartlari_kayit after insert or update or delete on public.stok_kartlari
  for each row execute function public.degisiklik_kaydet();
create trigger kdv_oranlari_kayit after insert or update or delete on public.kdv_oranlari
  for each row execute function public.degisiklik_kaydet();
create trigger depolar_kayit after insert or update or delete on public.depolar
  for each row execute function public.degisiklik_kaydet();
create trigger kapali_donemler_kayit after insert or update or delete on public.kapali_donemler
  for each row execute function public.degisiklik_kaydet();

-- 10) Yetkiler (RLS). Okuma: giriş yapan herkes. Yazma: izleyici hariç.
-- Hesap planı, KDV, depo, dönem kapatma: sadece başkan. Fişler: sadece okuma
-- (yazma belge fonksiyonlarından geçer). Silme yok; kart pasife alınır.
alter table public.hesap_plani enable row level security;
alter table public.kdv_oranlari enable row level security;
alter table public.depolar enable row level security;
alter table public.cariler enable row level security;
alter table public.stok_kartlari enable row level security;
alter table public.kapali_donemler enable row level security;
alter table public.yevmiye_fisleri enable row level security;
alter table public.yevmiye_satirlari enable row level security;
alter table public.degisiklik_kaydi enable row level security;

create policy "Giris yapan okur" on public.hesap_plani for select using (auth.uid() is not null);
create policy "Baskan ekler" on public.hesap_plani for insert with check (public.baskan_mi());
create policy "Baskan duzenler" on public.hesap_plani for update using (public.baskan_mi());

create policy "Giris yapan okur" on public.kdv_oranlari for select using (auth.uid() is not null);
create policy "Baskan ekler" on public.kdv_oranlari for insert with check (public.baskan_mi());
create policy "Baskan duzenler" on public.kdv_oranlari for update using (public.baskan_mi());

create policy "Giris yapan okur" on public.depolar for select using (auth.uid() is not null);
create policy "Baskan ekler" on public.depolar for insert with check (public.baskan_mi());
create policy "Baskan duzenler" on public.depolar for update using (public.baskan_mi());

create policy "Giris yapan okur" on public.cariler for select using (auth.uid() is not null);
create policy "Izleyici disi ekler" on public.cariler for insert with check (public.yazabilir());
create policy "Izleyici disi duzenler" on public.cariler for update using (public.yazabilir());

create policy "Giris yapan okur" on public.stok_kartlari for select using (auth.uid() is not null);
create policy "Izleyici disi ekler" on public.stok_kartlari for insert with check (public.yazabilir());
create policy "Izleyici disi duzenler" on public.stok_kartlari for update using (public.yazabilir());

create policy "Giris yapan okur" on public.kapali_donemler for select using (auth.uid() is not null);
create policy "Baskan kapatir" on public.kapali_donemler for insert with check (public.baskan_mi());
create policy "Baskan acar" on public.kapali_donemler for delete using (public.baskan_mi());

create policy "Giris yapan okur" on public.yevmiye_fisleri for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.yevmiye_satirlari for select using (auth.uid() is not null);

create policy "Baskan okur" on public.degisiklik_kaydi for select using (public.baskan_mi());
