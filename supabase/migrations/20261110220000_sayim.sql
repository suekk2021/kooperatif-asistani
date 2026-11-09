-- Stok sayımı (9 Kas 2026): depoda sayılan miktar ile sistemdeki miktar arasındaki fark
-- = "açıklanamayan fark" (kaçak / kayıt hatası). Fire takibinin üçüncü ayağı.
--
-- Fark ortalama maliyetle değerlenir ve stoğa işlenir. Muhasebe karşılığı TDHP'deki
-- sayım hesapları: eksik → B 197 / A 150-153, fazla → B 150-153 / A 397. Muhasebeci
-- araştırıp kapatır (fire kararındaki gibi sistem farkı kendi başına zarara yazmaz).
-- Sistem miktarı sayım kaydedildiği andaki miktardır.

insert into public.hesap_plani (kod, ad, aciklama, sistem) values
  ('197', 'Sayım ve Tesellüm Noksanları', 'Sayımda eksik çıkan malın değeri; muhasebeci araştırıp kapatır', true),
  ('397', 'Sayım ve Tesellüm Fazlaları', 'Sayımda fazla çıkan malın değeri; muhasebeci araştırıp kapatır', true)
on conflict (kod) do nothing;

create table public.sayimlar (
  id uuid primary key default gen_random_uuid(),
  sayim_no bigint generated always as identity unique,
  tarih date not null default current_date,
  sayan text,
  aciklama text,
  durum text not null default 'kayitli' check (durum in ('kayitli', 'iptal')),
  iptal_nedeni text,
  fis_id uuid references public.yevmiye_fisleri(id),
  iptal_fis_id uuid references public.yevmiye_fisleri(id),
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create trigger sayimlar_kayit after insert or update on public.sayimlar
  for each row execute function public.degisiklik_kaydet();

create table public.sayim_kalemleri (
  id bigint generated always as identity primary key,
  sayim_id uuid not null references public.sayimlar(id),
  stok_karti_id uuid not null references public.stok_kartlari(id),
  sistem_miktari numeric(14,3) not null,
  sayilan_miktar numeric(14,3) not null check (sayilan_miktar >= 0),
  fark numeric(14,3) not null,
  birim_maliyet numeric(14,4) not null default 0,
  fark_tutari numeric(14,2) not null default 0,
  unique (sayim_id, stok_karti_id)
);
create trigger sayim_kalemleri_kilit before update or delete on public.sayim_kalemleri
  for each row execute function public.degistirilemez();

-- p: {"tarih","sayan","aciklama","kalemler":[{"stok_karti_id","sayilan"}]}
create or replace function public.sayim_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_no bigint; v_tarih date := coalesce((p->>'tarih')::date, current_date);
  k jsonb; v_kart public.stok_kartlari; v_sistem numeric; v_sayilan numeric; v_fark numeric;
  v_bm numeric; v_tahmini boolean; v_tutar numeric(14,2); v_satirlar jsonb;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  if jsonb_typeof(p->'kalemler') <> 'array' or jsonb_array_length(p->'kalemler') = 0 then
    raise exception 'Hiçbir kart için sayım girilmedi';
  end if;

  insert into public.sayimlar (tarih, sayan, aciklama)
  values (v_tarih, nullif(trim(p->>'sayan'), ''), nullif(trim(p->>'aciklama'), ''))
  returning id, sayim_no into v_id, v_no;

  for k in select * from jsonb_array_elements(p->'kalemler') loop
    select * into v_kart from public.stok_kartlari
     where id = (k->>'stok_karti_id')::uuid and aktif and birlestirildigi_kart is null;
    if not found then raise exception 'Stok kartı bulunamadı'; end if;
    v_sayilan := (k->>'sayilan')::numeric;
    if v_sayilan is null or v_sayilan < 0 then raise exception '%: sayılan miktar eksi olamaz', v_kart.ad; end if;

    select coalesce(sum(miktar), 0) into v_sistem from public.stok_hareketleri where stok_karti_id = v_kart.id;
    v_fark := v_sayilan - v_sistem;
    v_bm := 0; v_tutar := 0;
    if v_fark <> 0 then
      select maliyet, tahmini into v_bm, v_tahmini from public.guncel_birim_maliyet(v_kart.id, abs(v_fark));
      v_tutar := round(v_fark * v_bm, 2);
      insert into public.stok_hareketleri (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, aciklama)
      values (v_tarih, v_kart.id, v_fark, v_bm, v_tutar, 'sayim', v_id, 'Sayım #' || v_no || ' farkı');
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

create or replace function public.sayim_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.sayimlar; v_iptal uuid;
begin
  if not public.yazabilir() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  if nullif(trim(p_neden), '') is null then raise exception 'İptal nedeni yazılmalı'; end if;
  select * into v from public.sayimlar where id = p_id for update;
  if not found or v.durum <> 'kayitli' then raise exception 'Sayım bulunamadı veya zaten iptal'; end if;

  insert into public.stok_hareketleri
    (tarih, stok_karti_id, miktar, birim_maliyet, tutar, kaynak_tur, kaynak_id, iptal_edilen_hareket, aciklama)
  select current_date, stok_karti_id, -miktar, birim_maliyet, -tutar, 'iptal', p_id, id, 'Sayım iptali: ' || p_neden
    from public.stok_hareketleri where kaynak_tur = 'sayim' and kaynak_id = p_id;
  if v.fis_id is not null then
    v_iptal := public.fis_iptal(v.fis_id, 'Sayım #' || v.sayim_no || ' iptali: ' || p_neden);
  end if;
  update public.sayimlar set durum = 'iptal', iptal_nedeni = p_neden, iptal_fis_id = v_iptal where id = p_id;
end;
$$;

revoke execute on function public.sayim_kaydet(jsonb) from public, anon;
revoke execute on function public.sayim_iptal(uuid, text) from public, anon;
grant execute on function public.sayim_kaydet(jsonb) to authenticated;
grant execute on function public.sayim_iptal(uuid, text) to authenticated;

alter table public.sayimlar enable row level security;
alter table public.sayim_kalemleri enable row level security;
create policy "Giris yapan okur" on public.sayimlar for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.sayim_kalemleri for select using (auth.uid() is not null);
