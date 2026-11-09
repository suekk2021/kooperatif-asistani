-- Adım 4: üretim partisi, reçete, ürün liste fiyatı.
--
-- Akış (tesiste telefondan): parti_baslat → tartılan malzemeler parti_girdileri'ne
-- eklenir (parti açıkken silinebilir) → parti_tamamla: malzemeler stoktan ortalama
-- maliyetle düşer, ürün lot + SKT ile stoğa girer, fiş kesilir.
-- Fiş (7/A, parti bazında): B 710 / A 150.xx (tüketim) + B 152.xx / A 711 (yansıtma).
-- Normal fire maliyetin içinde kalır (muhasebeci kararı: 689'a otomatik ayırma yok).
-- İşçilik (720) ve genel üretim (730) payı ay sonu dağıtımıyla eklenecek (Raporlar adımı).

alter table public.stok_kartlari add column satis_fiyati numeric(14,4) check (satis_fiyati >= 0);

-- Reçete: "cikti_miktari birim ürün için şu malzemeler". Zorunlu değil; sadece sapma
-- karşılaştırması için.
create table public.receteler (
  id uuid primary key default gen_random_uuid(),
  urun_karti_id uuid not null unique references public.stok_kartlari(id),
  cikti_miktari numeric(14,3) not null check (cikti_miktari > 0),
  aciklama text,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger receteler_set_updated_at before update on public.receteler
  for each row execute function public.set_updated_at();
create trigger receteler_kayit after insert or update or delete on public.receteler
  for each row execute function public.degisiklik_kaydet();

create table public.recete_kalemleri (
  id bigint generated always as identity primary key,
  recete_id uuid not null references public.receteler(id) on delete cascade,
  stok_karti_id uuid not null references public.stok_kartlari(id),
  miktar numeric(14,3) not null check (miktar > 0),
  unique (recete_id, stok_karti_id)
);
create trigger recete_kalemleri_kayit after insert or update or delete on public.recete_kalemleri
  for each row execute function public.degisiklik_kaydet();

create type public.parti_durumu as enum ('acik', 'tamamlandi', 'iptal');

create table public.uretim_partileri (
  id uuid primary key default gen_random_uuid(),
  parti_no bigint generated always as identity unique,
  urun_karti_id uuid not null references public.stok_kartlari(id),
  tarih date not null default current_date,
  sorumlu text,
  baslangic timestamptz not null default now(),
  bitis timestamptz,
  lot_no text,
  skt date,
  durum public.parti_durumu not null default 'acik',
  uretilen_miktar numeric(14,3) check (uretilen_miktar > 0),
  bozuk_miktar numeric(14,3) not null default 0 check (bozuk_miktar >= 0),
  bozuk_neden text,
  malzeme_maliyeti numeric(14,2),
  birim_maliyet numeric(14,4),
  aciklama text,
  iptal_nedeni text,
  fis_id uuid references public.yevmiye_fisleri(id),
  iptal_fis_id uuid references public.yevmiye_fisleri(id),
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bitis is null or bitis >= baslangic),
  check (durum <> 'tamamlandi' or uretilen_miktar is not null)
);
create index uretim_partileri_tarih_idx on public.uretim_partileri (tarih desc);
create index uretim_partileri_urun_idx on public.uretim_partileri (urun_karti_id);
create trigger uretim_partileri_set_updated_at before update on public.uretim_partileri
  for each row execute function public.set_updated_at();
create trigger uretim_partileri_kayit after insert or update on public.uretim_partileri
  for each row execute function public.degisiklik_kaydet();

create table public.parti_girdileri (
  id bigint generated always as identity primary key,
  parti_id uuid not null references public.uretim_partileri(id),
  stok_karti_id uuid not null references public.stok_kartlari(id),
  miktar numeric(14,3) not null check (miktar > 0),
  birim_maliyet numeric(14,4),
  maliyet numeric(14,2),
  maliyet_tahmini boolean not null default false,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index parti_girdileri_parti_idx on public.parti_girdileri (parti_id);

-- Girdi sadece açık partiye eklenir/silinir; malzeme hammadde, ambalaj veya yarı mamul olmalı.
-- Parti kapanırken maliyet sütunlarını sistem yazar (imece.parti_kapanis bayrağı).
create or replace function public.parti_girdi_kontrol()
returns trigger language plpgsql as $$
declare v_parti uuid := coalesce(new.parti_id, old.parti_id); v_tur public.stok_turu;
begin
  if current_setting('imece.parti_kapanis', true) = 'evet' then return coalesce(new, old); end if;
  if not exists (select 1 from public.uretim_partileri where id = v_parti and durum = 'acik') then
    raise exception 'Parti kapanmış; malzeme eklenemez veya silinemez';
  end if;
  if tg_op = 'UPDATE' then raise exception 'Girdi değiştirilemez; silip yeniden ekleyin'; end if;
  if tg_op = 'INSERT' then
    select tur into v_tur from public.stok_kartlari where id = new.stok_karti_id and aktif;
    if v_tur is null or v_tur not in ('hammadde', 'ambalaj', 'yari_mamul') then
      raise exception 'Üretime sadece hammadde, ambalaj veya yarı mamul girer';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger parti_girdileri_kontrol before insert or update or delete on public.parti_girdileri
  for each row execute function public.parti_girdi_kontrol();

-- p: {"urun_karti_id","sorumlu","aciklama","tarih"}
create or replace function public.parti_baslat(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tur public.stok_turu;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  select tur into v_tur from public.stok_kartlari
   where id = (p->>'urun_karti_id')::uuid and aktif and birlestirildigi_kart is null;
  if v_tur is null then raise exception 'Ürün seçilmedi'; end if;
  if v_tur not in ('mamul', 'yari_mamul') then raise exception 'Partide üretilen şey bir ürün (mamul) kartı olmalı'; end if;
  insert into public.uretim_partileri (urun_karti_id, tarih, sorumlu, aciklama)
  values ((p->>'urun_karti_id')::uuid, coalesce((p->>'tarih')::date, current_date),
          nullif(trim(p->>'sorumlu'), ''), nullif(trim(p->>'aciklama'), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- p: {"uretilen":320,"bozuk":12,"bozuk_neden":"Yırtık hamur","skt":"2027-05-07","bitis":"…","lot_no":"…"}
create or replace function public.parti_tamamla(p_id uuid, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.uretim_partileri; v_urun public.stok_kartlari; g record;
  v_bm numeric; v_tahmini boolean; v_toplam numeric(14,2); v_uretilen numeric := (p->>'uretilen')::numeric;
  v_lot text; v_satirlar jsonb;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  select * into v from public.uretim_partileri where id = p_id for update;
  if not found or v.durum <> 'acik' then raise exception 'Parti bulunamadı veya kapanmış'; end if;
  if coalesce(v_uretilen, 0) <= 0 then raise exception 'Paketlenen miktar sıfırdan büyük olmalı'; end if;
  if not exists (select 1 from public.parti_girdileri where parti_id = p_id) then
    raise exception 'Partiye hiç malzeme girilmemiş';
  end if;
  select * into v_urun from public.stok_kartlari where id = v.urun_karti_id;

  perform set_config('imece.parti_kapanis', 'evet', true);
  -- Her girdi sırayla stoktan düşer; aynı malzeme iki kez tartıldıysa ikincisi güncel ortalamayı kullanır.
  for g in select * from public.parti_girdileri where parti_id = p_id order by id loop
    select maliyet, tahmini into v_bm, v_tahmini from public.guncel_birim_maliyet(g.stok_karti_id, g.miktar);
    update public.parti_girdileri
       set birim_maliyet = v_bm, maliyet = round(v_bm * g.miktar, 2), maliyet_tahmini = v_tahmini
     where id = g.id;
    insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id)
    values (v.tarih, g.stok_karti_id, -g.miktar, v_bm, -round(v_bm * g.miktar, 2), 'uretim_girdi', p_id);
  end loop;
  perform set_config('imece.parti_kapanis', '', true);

  select coalesce(sum(maliyet), 0) into v_toplam from public.parti_girdileri where parti_id = p_id;
  v_lot := coalesce(nullif(trim(p->>'lot_no'), ''), to_char(v.tarih, 'YYMMDD') || '-' || v.parti_no);

  insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, lot_no, skt)
  values (v.tarih, v.urun_karti_id, v_uretilen, round(v_toplam / v_uretilen, 4), v_toplam, 'uretim_cikti', p_id,
          v_lot, (p->>'skt')::date);

  if v_toplam > 0 then
    with tuketim as (
      select s.kod, sum(pg.maliyet) as tutar
        from public.parti_girdileri pg join public.stok_kartlari s on s.id = pg.stok_karti_id
       where pg.parti_id = p_id and pg.maliyet > 0 group by s.kod
    )
    select jsonb_build_array(jsonb_build_object('hesap_kodu', '710', 'borc', v_toplam))
           || (select jsonb_agg(jsonb_build_object('hesap_kodu', kod, 'alacak', tutar) order by kod) from tuketim)
           || jsonb_build_array(jsonb_build_object('hesap_kodu', v_urun.kod, 'borc', v_toplam),
                                jsonb_build_object('hesap_kodu', '711', 'alacak', v_toplam))
      into v_satirlar;
    update public.uretim_partileri
       set fis_id = public.fis_olustur(v.tarih, 'Üretim partisi #' || v.parti_no || ' · ' || v_urun.ad, 'uretim', p_id, v_satirlar)
     where id = p_id;
  end if;

  update public.uretim_partileri
     set durum = 'tamamlandi',
         bitis = coalesce((p->>'bitis')::timestamptz, now()),
         uretilen_miktar = v_uretilen,
         bozuk_miktar = coalesce((p->>'bozuk')::numeric, 0),
         bozuk_neden = nullif(trim(p->>'bozuk_neden'), ''),
         skt = (p->>'skt')::date,
         lot_no = v_lot,
         malzeme_maliyeti = v_toplam,
         birim_maliyet = round(v_toplam / v_uretilen, 4)
   where id = p_id;
end;
$$;

create or replace function public.parti_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.uretim_partileri; v_iptal uuid;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  if nullif(trim(p_neden), '') is null then raise exception 'İptal nedeni yazılmalı'; end if;
  select * into v from public.uretim_partileri where id = p_id for update;
  if not found or v.durum = 'iptal' then raise exception 'Parti bulunamadı veya zaten iptal'; end if;

  if v.durum = 'tamamlandi' then
    insert into public.stok_hareketleri
      (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, iptal_edilen_hareket, lot_no, aciklama)
    select current_date, stok_karti_id, -miktar, birim_maliyet, -tutar, 'iptal', p_id, id, lot_no, 'Parti iptali: ' || p_neden
      from public.stok_hareketleri where kaynak_tur in ('uretim_girdi', 'uretim_cikti') and kaynak_id = p_id;
    if v.fis_id is not null then
      v_iptal := public.fis_iptal(v.fis_id, 'Parti #' || v.parti_no || ' iptali: ' || p_neden);
    end if;
  end if;

  update public.uretim_partileri
     set durum = 'iptal', iptal_nedeni = p_neden, iptal_fis_id = v_iptal where id = p_id;
end;
$$;

revoke execute on function public.parti_baslat(jsonb) from public, anon;
revoke execute on function public.parti_tamamla(uuid, jsonb) from public, anon;
revoke execute on function public.parti_iptal(uuid, text) from public, anon;
grant execute on function public.parti_baslat(jsonb) to authenticated;
grant execute on function public.parti_tamamla(uuid, jsonb) to authenticated;
grant execute on function public.parti_iptal(uuid, text) to authenticated;

alter table public.receteler enable row level security;
alter table public.recete_kalemleri enable row level security;
alter table public.uretim_partileri enable row level security;
alter table public.parti_girdileri enable row level security;

create policy "Giris yapan okur" on public.receteler for select using (auth.uid() is not null);
create policy "Izleyici disi ekler" on public.receteler for insert with check (public.yazabilir());
create policy "Izleyici disi duzenler" on public.receteler for update using (public.yazabilir());
create policy "Izleyici disi siler" on public.receteler for delete using (public.yazabilir());
create policy "Giris yapan okur" on public.recete_kalemleri for select using (auth.uid() is not null);
create policy "Izleyici disi ekler" on public.recete_kalemleri for insert with check (public.yazabilir());
create policy "Izleyici disi duzenler" on public.recete_kalemleri for update using (public.yazabilir());
create policy "Izleyici disi siler" on public.recete_kalemleri for delete using (public.yazabilir());
create policy "Giris yapan okur" on public.uretim_partileri for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.parti_girdileri for select using (auth.uid() is not null);
create policy "Izleyici disi ekler" on public.parti_girdileri for insert with check (public.yazabilir());
create policy "Izleyici disi siler" on public.parti_girdileri for delete using (public.yazabilir());
