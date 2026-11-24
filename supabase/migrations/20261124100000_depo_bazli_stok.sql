-- Depo bazlı stok (24 Kas 2026, Fatih Bey yazılı teyidi):
--   Hammadde depo: dışarıdan alınan her şey girer (hammadde, ambalaj, yardımcı malzeme).
--   Üretim depo:   Hammadde'den "Depolar arası transfer" ile beslenir; reçete tüketimi YALNIZ buradan düşer, eksiye düşebilir.
--   Mamül depo:    üretim çıktısı ve ticari mal alışı girer; satış buradan çıkar.
-- Soğuk/kuru ayrımı kalktı (eski "Kuru depo"/"Soğuk depo" kayıtları ve kartlardaki depo etiketi silinmedi, kullanılmıyor).
--
-- Fonksiyonlar tek tek değiştirilmedi: hareketin deposu yazılmazsa aşağıdaki kural atar
-- (iptal → asıl hareketin deposu; üretim girdisi → Üretim; diğerleri → kartın türüne göre ev deposu).
-- Ortalama maliyet hâlâ kart başına (tüm depolar); transfer maliyeti değiştirmez, aynı birim maliyetle −/+ yazılır.

alter table public.depolar add column gorev text unique check (gorev in ('hammadde', 'uretim', 'mamul'));

insert into public.depolar (ad, aciklama, gorev) values
  ('Hammadde depo', 'Dışarıdan alınan hammadde, ambalaj ve yardımcı malzeme', 'hammadde'),
  ('Üretim depo', 'Üretime verilen malzeme; reçete tüketimi buradan düşer', 'uretim'),
  ('Mamül depo', 'Satışa hazır ürün; üretim çıktısı ve ticari mal buraya girer, satış buradan çıkar', 'mamul')
on conflict (ad) do update set gorev = excluded.gorev, aktif = true;

create or replace function public.depo_kimligi(p_gorev text)
returns smallint language sql stable security definer set search_path = public as $$
  select id from public.depolar where gorev = p_gorev;
$$;

-- Kartın stoğunun normalde durduğu depo. Yarı mamul başka reçetede girdi olduğu için Üretim'de durur.
create or replace function public.kart_ev_deposu(p_kart uuid)
returns smallint language sql stable security definer set search_path = public as $$
  select public.depo_kimligi(case k.tur::text
           when 'mamul' then 'mamul'
           when 'ticari_mal' then 'mamul'
           when 'yari_mamul' then 'uretim'
           else 'hammadde' end)
    from public.stok_kartlari k where k.id = p_kart;
$$;

alter table public.stok_hareketleri add column depo_id smallint references public.depolar(id);

-- Eski hareketler: bugüne kadar Üretim deposu yoktu, üretim girdisi de Hammadde'den düşmüş sayılır.
-- Hareketler kilitli (değiştirilemez); yalnız yeni sütunu doldurmak için kilit bu işlem süresince kapatılır.
alter table public.stok_hareketleri disable trigger stok_hareketleri_kilit;
update public.stok_hareketleri h
   set depo_id = case when h.kaynak_tur = 'uretim_girdi' then public.depo_kimligi('hammadde')
                      else public.kart_ev_deposu(h.stok_karti_id) end
 where h.iptal_edilen_hareket is null;
update public.stok_hareketleri h
   set depo_id = a.depo_id
  from public.stok_hareketleri a
 where a.id = h.iptal_edilen_hareket;
alter table public.stok_hareketleri enable trigger stok_hareketleri_kilit;

alter table public.stok_hareketleri alter column depo_id set not null;
create index stok_hareketleri_depo_idx on public.stok_hareketleri (stok_karti_id, depo_id);

create or replace function public.stok_hareketi_depo_ata()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.depo_id is null then
    if new.iptal_edilen_hareket is not null then
      select depo_id into new.depo_id from public.stok_hareketleri where id = new.iptal_edilen_hareket;
    elsif new.kaynak_tur = 'uretim_girdi' then
      new.depo_id := public.depo_kimligi('uretim');
    else
      new.depo_id := public.kart_ev_deposu(new.stok_karti_id);
    end if;
  end if;
  return new;
end;
$$;
create trigger stok_hareketleri_depo before insert on public.stok_hareketleri
  for each row execute function public.stok_hareketi_depo_ata();

alter table public.stok_hareketleri drop constraint stok_hareketleri_kaynak_tur_check;
alter table public.stok_hareketleri add constraint stok_hareketleri_kaynak_tur_check check (kaynak_tur in
  ('alis', 'satis', 'uretim_girdi', 'uretim_cikti', 'sayim', 'acilis', 'iptal', 'iade', 'transfer'));

create view public.stok_depo_durumu with (security_invoker = true) as
select h.stok_karti_id, h.depo_id,
       sum(h.miktar)::numeric(14,3) as miktar,
       sum(h.tutar)::numeric(14,2) as deger
  from public.stok_hareketleri h
 group by h.stok_karti_id, h.depo_id;

-- Depolar arası transfer yetkisi (Fatih Bey: depo sorumlusu, muhasebe ve kendisi):
-- yönetici (başkan, operasyon, bilgi işlem, teknik destek) + ön muhasebe + depo. Muhasebeci giremez.
-- Gövde 20261111180000_acilis_on_muhasebe.sql'deki son sürümün aynısı + 'transfer' satırı.
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
             when 'alis'     then rol::text in ('on_muhasebe', 'depo')
             when 'uretim'   then rol::text in ('on_muhasebe', 'depo')
             when 'sayim'    then rol::text in ('on_muhasebe', 'depo')
             when 'transfer' then rol::text in ('on_muhasebe', 'depo')
             when 'satis'    then rol::text = 'on_muhasebe'
             when 'kasa'     then rol::text = 'on_muhasebe'
             when 'acilis'   then rol::text = 'on_muhasebe'
             else false
           end);
$function$;

-- Gövde 20261111220000_iptal_mesaji_kooperatif_yonetimi.sql'deki son sürümün aynısı + 'depo_transferleri'.
create or replace function public.iptal_izni_kontrol(p_tablo text, p_id uuid)
returns void
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare v_olusturan uuid; v_zaman timestamptz;
begin
  if p_tablo not in ('para_hareketleri', 'alis_faturalari', 'satis_faturalari', 'uretim_partileri', 'sayimlar',
                     'yevmiye_fisleri', 'iadeler', 'evrak_hareketleri', 'depo_transferleri') then
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

create table public.depo_transferleri (
  id uuid primary key default gen_random_uuid(),
  transfer_no bigint generated always as identity unique,
  tarih date not null default current_date,
  kaynak_depo smallint not null references public.depolar(id),
  hedef_depo smallint not null references public.depolar(id),
  aciklama text,
  durum text not null default 'kayitli' check (durum in ('kayitli', 'iptal')),
  iptal_nedeni text,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (kaynak_depo <> hedef_depo)
);
create trigger depo_transferleri_kayit after insert or update on public.depo_transferleri
  for each row execute function public.degisiklik_kaydet();

create table public.depo_transfer_kalemleri (
  id bigint generated always as identity primary key,
  transfer_id uuid not null references public.depo_transferleri(id),
  stok_karti_id uuid not null references public.stok_kartlari(id),
  miktar numeric(14,3) not null check (miktar > 0),
  birim_maliyet numeric(14,4) not null default 0
);
create index depo_transfer_kalemleri_transfer_idx on public.depo_transfer_kalemleri (transfer_id);
create trigger depo_transfer_kalemleri_kilit before update or delete on public.depo_transfer_kalemleri
  for each row execute function public.degistirilemez();

alter table public.depo_transferleri enable row level security;
alter table public.depo_transfer_kalemleri enable row level security;
create policy "Giris yapan okur" on public.depo_transferleri for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.depo_transfer_kalemleri for select using (auth.uid() is not null);

-- p: {"tarih","kaynak_depo","hedef_depo","aciklama","kalemler":[{"stok_karti_id","miktar"}]}
-- Kaynak depoda yeterli mal olmasa da kaydeder (Fatih Bey: eksiye düşsün); ekran uyarır.
create or replace function public.transfer_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_no bigint; v_tarih date := coalesce((p->>'tarih')::date, current_date);
  v_kaynak smallint := (p->>'kaynak_depo')::smallint; v_hedef smallint := (p->>'hedef_depo')::smallint;
  k jsonb; v_kart public.stok_kartlari; v_miktar numeric; v_bm numeric; v_tahmini boolean; v_tutar numeric(14,2);
begin
  perform public.islem_izni_kontrol('transfer');
  if v_kaynak is null or v_hedef is null then raise exception 'Çıkış ve giriş deposu seçilmeli'; end if;
  if v_kaynak = v_hedef then raise exception 'Çıkış ve giriş deposu aynı olamaz'; end if;
  if not exists (select 1 from public.depolar where id = v_kaynak and aktif and gorev is not null)
     or not exists (select 1 from public.depolar where id = v_hedef and aktif and gorev is not null) then
    raise exception 'Depo bulunamadı';
  end if;
  if jsonb_typeof(p->'kalemler') <> 'array' or jsonb_array_length(p->'kalemler') = 0 then
    raise exception 'Hiçbir malzeme girilmedi';
  end if;

  insert into public.depo_transferleri (tarih, kaynak_depo, hedef_depo, aciklama)
  values (v_tarih, v_kaynak, v_hedef, nullif(trim(p->>'aciklama'), ''))
  returning id, transfer_no into v_id, v_no;

  for k in select * from jsonb_array_elements(p->'kalemler') loop
    select * into v_kart from public.stok_kartlari
     where id = (k->>'stok_karti_id')::uuid and aktif and birlestirildigi_kart is null;
    if not found then raise exception 'Stok kartı bulunamadı'; end if;
    v_miktar := (k->>'miktar')::numeric;
    if v_miktar is null or v_miktar <= 0 then raise exception '%: miktar sıfırdan büyük olmalı', v_kart.ad; end if;

    select maliyet, tahmini into v_bm, v_tahmini from public.guncel_birim_maliyet(v_kart.id, v_miktar);
    v_tutar := round(v_bm * v_miktar, 2);
    insert into public.depo_transfer_kalemleri (transfer_id, stok_karti_id, miktar, birim_maliyet)
    values (v_id, v_kart.id, v_miktar, v_bm);
    insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, depo_id, aciklama)
    values (v_tarih, v_kart.id, -v_miktar, v_bm, -v_tutar, 'transfer', v_id, v_kaynak, 'Transfer #' || v_no),
           (v_tarih, v_kart.id, v_miktar, v_bm, v_tutar, 'transfer', v_id, v_hedef, 'Transfer #' || v_no);
  end loop;

  return v_id;
end;
$$;

create or replace function public.transfer_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.depo_transferleri;
begin
  perform public.islem_izni_kontrol('transfer'); perform public.iptal_izni_kontrol('depo_transferleri', p_id);
  if nullif(trim(p_neden), '') is null then raise exception 'İptal nedeni yazılmalı'; end if;
  select * into v from public.depo_transferleri where id = p_id for update;
  if not found or v.durum <> 'kayitli' then raise exception 'Transfer bulunamadı veya zaten iptal'; end if;

  insert into public.stok_hareketleri
    (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, iptal_edilen_hareket, aciklama)
  select current_date, stok_karti_id, -miktar, birim_maliyet, -tutar, 'iptal', p_id, id, 'Transfer iptali: ' || p_neden
    from public.stok_hareketleri where kaynak_tur = 'transfer' and kaynak_id = p_id;
  update public.depo_transferleri set durum = 'iptal', iptal_nedeni = p_neden where id = p_id;
end;
$$;

revoke execute on function public.transfer_kaydet(jsonb) from public, anon;
revoke execute on function public.transfer_iptal(uuid, text) from public, anon;
grant execute on function public.transfer_kaydet(jsonb) to authenticated;
grant execute on function public.transfer_iptal(uuid, text) to authenticated;

-- Sayım artık bir depoda yapılır; sistem miktarı o depodaki miktardır.
-- Eski sayımlarda depo boş kalır (o zaman tek depo vardı).
alter table public.sayimlar add column depo_id smallint references public.depolar(id);

-- p: {"tarih","sayan","aciklama","depo_id","kalemler":[{"stok_karti_id","sayilan"}]}
-- depo_id gelmezse her kart kendi ev deposunda sayılmış kabul edilir.
-- Yetki satırı 20261111100000_islem_yetkileri.sql'in eklediği kontrolle aynı.
create or replace function public.sayim_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_no bigint; v_tarih date := coalesce((p->>'tarih')::date, current_date);
  v_depo smallint := (p->>'depo_id')::smallint; v_kart_depo smallint;
  k jsonb; v_kart public.stok_kartlari; v_sistem numeric; v_sayilan numeric; v_fark numeric;
  v_bm numeric; v_tahmini boolean; v_tutar numeric(14,2); v_satirlar jsonb;
begin
  perform public.islem_izni_kontrol('sayim');
  if jsonb_typeof(p->'kalemler') <> 'array' or jsonb_array_length(p->'kalemler') = 0 then
    raise exception 'Hiçbir kart için sayım girilmedi';
  end if;
  if v_depo is not null and not exists (select 1 from public.depolar where id = v_depo and gorev is not null) then
    raise exception 'Depo bulunamadı';
  end if;

  insert into public.sayimlar (tarih, sayan, aciklama, depo_id)
  values (v_tarih, nullif(trim(p->>'sayan'), ''), nullif(trim(p->>'aciklama'), ''), v_depo)
  returning id, sayim_no into v_id, v_no;

  for k in select * from jsonb_array_elements(p->'kalemler') loop
    select * into v_kart from public.stok_kartlari
     where id = (k->>'stok_karti_id')::uuid and aktif and birlestirildigi_kart is null;
    if not found then raise exception 'Stok kartı bulunamadı'; end if;
    v_sayilan := (k->>'sayilan')::numeric;
    if v_sayilan is null or v_sayilan < 0 then raise exception '%: sayılan miktar eksi olamaz', v_kart.ad; end if;
    v_kart_depo := coalesce(v_depo, public.kart_ev_deposu(v_kart.id));

    select coalesce(sum(miktar), 0) into v_sistem from public.stok_hareketleri
     where stok_karti_id = v_kart.id and depo_id = v_kart_depo;
    v_fark := v_sayilan - v_sistem;
    v_bm := 0; v_tutar := 0;
    if v_fark <> 0 then
      select maliyet, tahmini into v_bm, v_tahmini from public.guncel_birim_maliyet(v_kart.id, abs(v_fark));
      v_tutar := round(v_fark * v_bm, 2);
      insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, depo_id, aciklama)
      values (v_tarih, v_kart.id, v_fark, v_bm, v_tutar, 'sayim', v_id, v_kart_depo, 'Sayım #' || v_no || ' farkı');
    end if;

    insert into public.sayim_kalemleri (sayim_id, stok_karti_id, sistem_miktari, sayilan_miktar, fark, birim_maliyet, fark_tutari)
    values (v_id, v_kart.id, v_sistem, v_sayilan, v_fark, v_bm, v_tutar);
  end loop;

  with k as (select sk.fark_tutari, s.kod from public.sayim_kalemleri sk
               join public.stok_kartlari s on s.id = sk.stok_karti_id
              where sk.sayim_id = v_id and sk.fark_tutari <> 0),
  satirlar as (
    select 1 as grup, '197' as hesap, sum(-fark_tutari) as borc, 0::numeric as alacak from k where fark_tutari < 0 having count(*) > 0
    union all
    select 2, kod, 0, -fark_tutari from k where fark_tutari < 0
    union all
    select 3, kod, fark_tutari, 0 from k where fark_tutari > 0
    union all
    select 4, '397', 0, sum(fark_tutari) from k where fark_tutari > 0 having count(*) > 0
  )
  select jsonb_agg(jsonb_build_object('hesap_kodu', hesap, 'borc', borc, 'alacak', alacak) order by grup, hesap)
    into v_satirlar from satirlar;

  if v_satirlar is not null and jsonb_array_length(v_satirlar) >= 2 then
    update public.sayimlar
       set fis_id = public.fis_olustur(v_tarih, 'Stok sayımı #' || v_no, 'sayim', v_id, v_satirlar)
     where id = v_id;
  end if;

  return v_id;
end;
$$;
