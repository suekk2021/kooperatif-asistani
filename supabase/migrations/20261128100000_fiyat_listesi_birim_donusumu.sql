-- Fiyat listeleri + birim dönüşümü (Fatih Bey, 26-27 Kas 2026).
-- Kararlar:
--  * Her stok kartının ana birimi vardır; diğer birimler (paket, koli …) ana birim karşılığıyla tanımlanır
--    (Mantı: ana birim kg, 1 paket = 0,410 kg, 1 koli = 4,920 kg).
--  * Satışta paket/koli seçilse de fatura, stok hareketi ve raporlar HEP ana birimdir; girilen birim ve miktar
--    yalnız bilgi olarak satış kaleminde saklanır.
--  * Fiyat listesinde her zaman ana birimin KDV hariç fiyatı vardır. Müşteriye fiyat listesi atamak ZORUNLU;
--    satışta fiyat elle girilmez, listeden gelir; ürün listede yoksa satış kaydedilmez. KDV stok kartından gelir.
--  * Fiyat listelerini başkan, operasyon, ön muhasebe, bilgi işlem (ve teknik destek) düzenler; diğerleri görür.
--  * Dönüşüm hammaddeye de tanımlanabilir; alış ekranında kullanımı ikinci aşama.
-- Mevcut veriye dokunulmaz; yalnız yeni tablo/sütun ve satis_kaydet'in yeni hâli.

-- 1) Yetki
create or replace function public.fiyat_yetkili()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid()
                 and rol::text in ('baskan', 'operasyon', 'on_muhasebe', 'bilgi_islem', 'destek'));
$$;
revoke execute on function public.fiyat_yetkili() from public, anon;
grant execute on function public.fiyat_yetkili() to authenticated;

-- 2) Birim dönüşümleri
create table public.birim_donusumleri (
  id uuid primary key default gen_random_uuid(),
  stok_karti_id uuid not null references public.stok_kartlari(id),
  birim text not null check (birim in ('kg', 'g', 'lt', 'adet', 'paket', 'koli')),
  katsayi numeric(14,4) not null check (katsayi > 0),
  aktif boolean not null default true,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stok_karti_id, birim)
);
create index birim_donusumleri_kart_idx on public.birim_donusumleri (stok_karti_id);

create or replace function public.birim_donusumu_kontrol()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.stok_karti_id <> old.stok_karti_id or new.birim <> old.birim) then
    raise exception 'Dönüşümün kartı ve birimi değiştirilemez; yeni birim ekleyin';
  end if;
  if exists (select 1 from public.stok_kartlari where id = new.stok_karti_id and birim = new.birim) then
    raise exception 'Ana birim (%) için dönüşüm tanımlanmaz', new.birim;
  end if;
  return new;
end;
$$;
create trigger birim_donusumleri_kontrol before insert or update on public.birim_donusumleri
  for each row execute function public.birim_donusumu_kontrol();
create trigger birim_donusumleri_set_updated_at before update on public.birim_donusumleri
  for each row execute function public.set_updated_at();
create trigger birim_donusumleri_kayit after insert or update or delete on public.birim_donusumleri
  for each row execute function public.degisiklik_kaydet();

alter table public.birim_donusumleri enable row level security;
create policy "Giris yapan okur" on public.birim_donusumleri for select using (auth.uid() is not null);
create policy "Izleyici disi ekler" on public.birim_donusumleri for insert with check (public.yazabilir());
create policy "Izleyici disi duzenler" on public.birim_donusumleri for update using (public.yazabilir());

-- 3) Fiyat listeleri
create table public.fiyat_listeleri (
  id uuid primary key default gen_random_uuid(),
  ad text not null unique check (length(trim(ad)) > 0),
  aciklama text,
  aktif boolean not null default true,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger fiyat_listeleri_set_updated_at before update on public.fiyat_listeleri
  for each row execute function public.set_updated_at();
create trigger fiyat_listeleri_kayit after insert or update or delete on public.fiyat_listeleri
  for each row execute function public.degisiklik_kaydet();

create table public.fiyat_listesi_kalemleri (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null references public.fiyat_listeleri(id),
  stok_karti_id uuid not null references public.stok_kartlari(id),
  fiyat numeric(14,4) not null check (fiyat > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (liste_id, stok_karti_id)
);
create index fiyat_listesi_kalemleri_kart_idx on public.fiyat_listesi_kalemleri (stok_karti_id);
create trigger fiyat_listesi_kalemleri_set_updated_at before update on public.fiyat_listesi_kalemleri
  for each row execute function public.set_updated_at();
create trigger fiyat_listesi_kalemleri_kayit after insert or update or delete on public.fiyat_listesi_kalemleri
  for each row execute function public.degisiklik_kaydet();

alter table public.fiyat_listeleri enable row level security;
alter table public.fiyat_listesi_kalemleri enable row level security;
create policy "Giris yapan okur" on public.fiyat_listeleri for select using (auth.uid() is not null);
create policy "Fiyat yetkilisi ekler" on public.fiyat_listeleri for insert with check (public.fiyat_yetkili());
create policy "Fiyat yetkilisi duzenler" on public.fiyat_listeleri for update using (public.fiyat_yetkili());
create policy "Giris yapan okur" on public.fiyat_listesi_kalemleri for select using (auth.uid() is not null);
create policy "Fiyat yetkilisi ekler" on public.fiyat_listesi_kalemleri for insert with check (public.fiyat_yetkili());
create policy "Fiyat yetkilisi duzenler" on public.fiyat_listesi_kalemleri for update using (public.fiyat_yetkili());
-- Listeden ürün çıkarmak = satırı silmek (İşlem Geçmişi'ne eski fiyatla düşer).
create policy "Fiyat yetkilisi siler" on public.fiyat_listesi_kalemleri for delete using (public.fiyat_yetkili());

-- 4) Müşteri kartında fiyat listesi. Müşterinin listesini yalnız fiyat yetkilisi değiştirir
--    (liste fiyatı belirlediği için; cari kartını düzenleyen depo görevlisi değiştiremez).
alter table public.cariler add column fiyat_listesi_id uuid references public.fiyat_listeleri(id);

create or replace function public.cari_fiyat_listesi_kontrol()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.fiyat_listesi_id is distinct from (case when tg_op = 'UPDATE' then old.fiyat_listesi_id end) then
    if new.fiyat_listesi_id is not null and new.tur <> 'musteri' then
      raise exception 'Fiyat listesi yalnız müşteri kartına atanır';
    end if;
    -- auth.uid() boşsa (yönetim paneli / migration) kontrol yapılmaz.
    if auth.uid() is not null and not public.fiyat_yetkili() then
      raise exception 'Müşterinin fiyat listesini değiştirme yetkiniz yok';
    end if;
  end if;
  return new;
end;
$$;
create trigger cariler_fiyat_listesi before insert or update on public.cariler
  for each row execute function public.cari_fiyat_listesi_kontrol();

-- 5) Satış kaleminde girilen birim ve miktar (bilgi amaçlı; hesap hep ana birimle)
alter table public.satis_kalemleri add column girilen_birim text;
alter table public.satis_kalemleri add column girilen_miktar numeric(14,3);

-- 6) Satış kaydı: miktar dönüşümle ana birime çevrilir, fiyat müşterinin listesinden, KDV stok kartından gelir.
--    Tarayıcıdan gelen birim_fiyat ve kdv_orani kullanılmaz. Eski ekran (birim göndermeyen) da çalışır:
--    birim yoksa ana birim, miktar "miktar" alanından okunur.
create or replace function public.satis_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_cari public.cariler; v_tarih date := coalesce((p->>'tarih')::date, current_date);
  v_odeme uuid; v_hareket uuid; v_ara numeric(14,2); v_kdv numeric(14,2); v_maliyet numeric(14,2); v_isk numeric(14,2);
  v_satirlar jsonb; k jsonb; v_sira int := 0; v_kart public.stok_kartlari;
  v_brut numeric(14,2); v_tutar numeric(14,2); v_kdv_t numeric(14,2); v_bm numeric; v_tahmini boolean; v_no bigint;
  v_genel numeric := coalesce(nullif(p->>'genel_iskonto_orani', '')::numeric, 0); v_satir_isk numeric;
  v_liste public.fiyat_listeleri; v_birim text; v_girilen numeric; v_katsayi numeric; v_miktar numeric;
  v_fiyat numeric; v_kdv_oran numeric;
begin
  perform public.islem_izni_kontrol('satis');
  if v_genel < 0 or v_genel >= 100 then raise exception 'Genel iskonto 0 ile 100 arasında olmalı'; end if;

  select * into v_cari from public.cariler where id = (p->>'cari_id')::uuid and aktif;
  if not found then raise exception 'Müşteri seçilmedi'; end if;
  if v_cari.tur <> 'musteri' then raise exception '% bir tedarikçi kartı; satış müşteriye yapılır', v_cari.unvan; end if;
  select * into v_liste from public.fiyat_listeleri where id = v_cari.fiyat_listesi_id and aktif;
  if not found then
    raise exception '% için fiyat listesi tanımlı değil. Müşteri kartından bir fiyat listesi seçin.', v_cari.unvan;
  end if;
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

    v_birim := coalesce(nullif(trim(k->>'birim'), ''), v_kart.birim);
    v_girilen := coalesce(nullif(k->>'girilen_miktar', '')::numeric, nullif(k->>'miktar', '')::numeric, 0);
    if v_girilen <= 0 then raise exception '%. kalem: miktar sıfırdan büyük olmalı', v_sira; end if;
    if v_birim = v_kart.birim then
      v_miktar := v_girilen;
    else
      select katsayi into v_katsayi from public.birim_donusumleri
       where stok_karti_id = v_kart.id and birim = v_birim and aktif;
      if not found then
        raise exception '%. kalem: % için "%" birimi tanımlı değil (stok kartından birim dönüşümü ekleyin)', v_sira, v_kart.ad, v_birim;
      end if;
      v_miktar := round(v_girilen * v_katsayi, 3);
      if v_miktar <= 0 then raise exception '%. kalem: miktar çok küçük', v_sira; end if;
    end if;

    select fiyat into v_fiyat from public.fiyat_listesi_kalemleri
     where liste_id = v_liste.id and stok_karti_id = v_kart.id;
    if not found then
      raise exception '%. kalem: % müşterinin fiyat listesinde (%) bulunamadı', v_sira, v_kart.ad, v_liste.ad;
    end if;
    v_kdv_oran := v_kart.kdv_orani;

    v_satir_isk := coalesce(nullif(k->>'iskonto_orani', '')::numeric, 0);
    if v_satir_isk < 0 or v_satir_isk >= 100 then raise exception '%. kalem: iskonto 0 ile 100 arasında olmalı', v_sira; end if;

    v_brut := round(v_miktar * v_fiyat, 2);
    v_tutar := round(v_miktar * v_fiyat * (1 - v_satir_isk / 100) * (1 - v_genel / 100), 2);
    v_kdv_t := round(v_tutar * v_kdv_oran / 100, 2);
    select maliyet, tahmini into v_bm, v_tahmini from public.guncel_birim_maliyet(v_kart.id, v_miktar);

    insert into public.satis_kalemleri
      (fatura_id, sira, stok_karti_id, lot_no, miktar, birim_fiyat, kdv_orani, tutar, kdv_tutari,
       birim_maliyet, maliyet_tutari, maliyet_tahmini, iskonto_orani, iskonto_tutari, girilen_birim, girilen_miktar)
    values (v_id, v_sira, v_kart.id, nullif(trim(k->>'lot_no'), ''), v_miktar,
            v_fiyat, v_kdv_oran, v_tutar, v_kdv_t,
            v_bm, round(v_bm * v_miktar, 2), v_tahmini, v_satir_isk, v_brut - v_tutar, v_birim, v_girilen);

    -- Aynı faturada aynı ürün iki satırda olabilir; her satır anında stoktan düşer ki
    -- ikinci satırın maliyeti güncel stoktan hesaplansın.
    insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, lot_no)
    values (v_tarih, v_kart.id, -v_miktar, v_bm, -round(v_bm * v_miktar, 2),
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
