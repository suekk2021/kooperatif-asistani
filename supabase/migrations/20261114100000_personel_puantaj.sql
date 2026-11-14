-- Personel + puantaj + hak ediş (14 Kas 2026, kullanıcı onayı; Nagihan Hanım'ın Excel'i ve cevaplarına göre).
--
-- Çerçeve: resmi bordro/SGK/vergi hesabı YOK (mali müşavirde). Program kim kaç gün/saat çalıştı, ne hak etti
-- onu tutar; mali müşavire aylık puantaj özeti gider. Muhasebe fişi kesilmez.
--
-- Gizlilik: tutarlar yalnız maas_gorur() rollerine açık. Bu tablolara genel degisiklik_kaydet() BAĞLANMAZ:
-- o kayıt satırın tamamını (tutarlarla) yazar ve muhasebeci rolü okur. Onun yerine ayrı, kilitli
-- maas_degisiklik_kaydi tutulur. Silme yok (politika yok); yanlış gün 0 yapılır, kişi "ayrıldı" yapılır.
--
-- Hesap kuralı bilerek sade: günün tutarı = miktar × o tarihte geçerli ücret (ya da elle yazılan tutar).
-- Resmi tatil / hafta tatili için ayrı çarpan yok; ödeniyorsa Nagihan Hanım o güne 1 yazar, ödenmiyorsa 0
-- (Excel'de bugün yaptığı gibi). Gün türü yalnız mali müşavir özetindeki sayımlar içindir.

-- bilgi_islem: kullanıcı kararı (14 Kas) "şimdilik görsün" — program oturunca çıkarılabilir. destek bilerek yok.
create or replace function public.maas_gorur()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol::text in ('baskan', 'operasyon', 'on_muhasebe', 'bilgi_islem'));
$$;

create table public.personeller (
  id uuid primary key default gen_random_uuid(),
  ad_soyad text not null check (length(trim(ad_soyad)) > 0),
  durum text not null default 'calisiyor' check (durum in ('giris_bekliyor', 'calisiyor', 'ayrildi')),
  ise_baslama date,
  ayrilis date,
  notlar text,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (ayrilis is null or ise_baslama is null or ayrilis >= ise_baslama)
);

-- Ücret tarihlidir: zam/deneme süresi yarım ücret/saatliden günlüğe geçiş yeni satırla girilir, eski aylar bozulmaz.
create table public.personel_ucretleri (
  id uuid primary key default gen_random_uuid(),
  personel_id uuid not null references public.personeller(id),
  baslangic date not null,
  ucret_tipi text not null check (ucret_tipi in ('gunluk', 'saatlik')),
  tutar numeric(12, 2) not null check (tutar >= 0),
  aciklama text,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (personel_id, baslangic)
);

-- Yol parası, sigorta parası vb. "gunluk" = çalıştığı (miktarı 0'dan büyük) her gün için bir kez; "aylik" = ay başına.
create table public.personel_ek_odemeleri (
  id uuid primary key default gen_random_uuid(),
  personel_id uuid not null references public.personeller(id),
  ad text not null check (length(trim(ad)) > 0),
  birim text not null check (birim in ('gunluk', 'aylik')),
  tutar numeric(12, 2) not null check (tutar >= 0),
  baslangic date not null,
  bitis date,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (bitis is null or bitis >= baslangic)
);

-- Bir kişinin bir günü. miktar: günlük ücretlide gün (0, 0.5, 1, 2…), saatlikte saat.
create table public.puantaj (
  id uuid primary key default gen_random_uuid(),
  personel_id uuid not null references public.personeller(id),
  tarih date not null,
  gun_turu text not null default 'calisti'
    check (gun_turu in ('calisti', 'eksik', 'izinli', 'raporlu', 'resmi_tatil', 'hafta_tatili')),
  miktar numeric(5, 2) not null default 0 check (miktar >= 0 and miktar <= 24),
  elle_tutar numeric(12, 2) check (elle_tutar >= 0),
  aciklama text,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  guncelleyen uuid references public.profiller(id),
  updated_at timestamptz,
  unique (personel_id, tarih)
);
create index puantaj_tarih_idx on public.puantaj (tarih);

-- Ay sonu: avans/kesinti gibi düzeltme ve "ödendi" işareti.
create table public.maas_aylik (
  id uuid primary key default gen_random_uuid(),
  personel_id uuid not null references public.personeller(id),
  donem date not null check (extract(day from donem) = 1),
  duzeltme numeric(12, 2) not null default 0,
  duzeltme_aciklama text,
  odendi_tarihi date,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (personel_id, donem),
  check (duzeltme = 0 or length(trim(coalesce(duzeltme_aciklama, ''))) > 0)
);

create or replace function public.puantaj_guncelleyen()
returns trigger language plpgsql set search_path = public as $$
begin
  new.guncelleyen := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
create trigger puantaj_guncelleyen before update on public.puantaj
  for each row execute function public.puantaj_guncelleyen();

-- Kilitli değişiklik kaydı (yalnız maas_gorur okur; kimse elle yazamaz/silemez).
create table public.maas_degisiklik_kaydi (
  id bigint generated always as identity primary key,
  tablo text not null,
  kayit text,
  personel_id uuid,
  islem text not null,
  eski jsonb,
  yeni jsonb,
  kullanici uuid default auth.uid(),
  zaman timestamptz not null default now()
);
create index maas_degisiklik_kaydi_personel_idx on public.maas_degisiklik_kaydi (personel_id, zaman desc);

create or replace function public.maas_degisiklik_kaydet()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_satir jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.maas_degisiklik_kaydi (tablo, kayit, personel_id, islem, eski, yeni)
  values (tg_table_name, v_satir->>'id', coalesce(v_satir->>'personel_id', v_satir->>'id')::uuid, tg_op,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

create trigger personeller_kayit after insert or update or delete on public.personeller
  for each row execute function public.maas_degisiklik_kaydet();
create trigger personel_ucretleri_kayit after insert or update or delete on public.personel_ucretleri
  for each row execute function public.maas_degisiklik_kaydet();
create trigger personel_ek_odemeleri_kayit after insert or update or delete on public.personel_ek_odemeleri
  for each row execute function public.maas_degisiklik_kaydet();
create trigger puantaj_kayit after insert or update or delete on public.puantaj
  for each row execute function public.maas_degisiklik_kaydet();
create trigger maas_aylik_kayit after insert or update or delete on public.maas_aylik
  for each row execute function public.maas_degisiklik_kaydet();

alter table public.personeller enable row level security;
alter table public.personel_ucretleri enable row level security;
alter table public.personel_ek_odemeleri enable row level security;
alter table public.puantaj enable row level security;
alter table public.maas_aylik enable row level security;
alter table public.maas_degisiklik_kaydi enable row level security;

create policy "Maas yetkilisi okur" on public.personeller for select using (public.maas_gorur());
create policy "Maas yetkilisi ekler" on public.personeller for insert with check (public.maas_gorur());
create policy "Maas yetkilisi duzenler" on public.personeller for update using (public.maas_gorur());

create policy "Maas yetkilisi okur" on public.personel_ucretleri for select using (public.maas_gorur());
create policy "Maas yetkilisi ekler" on public.personel_ucretleri for insert with check (public.maas_gorur());
create policy "Maas yetkilisi duzenler" on public.personel_ucretleri for update using (public.maas_gorur());

create policy "Maas yetkilisi okur" on public.personel_ek_odemeleri for select using (public.maas_gorur());
create policy "Maas yetkilisi ekler" on public.personel_ek_odemeleri for insert with check (public.maas_gorur());
create policy "Maas yetkilisi duzenler" on public.personel_ek_odemeleri for update using (public.maas_gorur());

create policy "Maas yetkilisi okur" on public.puantaj for select using (public.maas_gorur());
create policy "Maas yetkilisi ekler" on public.puantaj for insert with check (public.maas_gorur());
create policy "Maas yetkilisi duzenler" on public.puantaj for update using (public.maas_gorur());

create policy "Maas yetkilisi okur" on public.maas_aylik for select using (public.maas_gorur());
create policy "Maas yetkilisi ekler" on public.maas_aylik for insert with check (public.maas_gorur());
create policy "Maas yetkilisi duzenler" on public.maas_aylik for update using (public.maas_gorur());

create policy "Maas yetkilisi okur" on public.maas_degisiklik_kaydi for select using (public.maas_gorur());

-- Aylık özet: ekran, mali müşavir raporu ve Excel aynı hesabı kullanır.
create or replace function public.maas_ay_ozeti(p_donem date)
returns table (
  personel_id uuid,
  ad_soyad text,
  durum text,
  ucret_tipi text,
  calisilan_gun integer,
  fazla_gun numeric,
  toplam_miktar numeric,
  eksik_gun integer,
  izinli_gun integer,
  raporlu_gun integer,
  resmi_tatil integer,
  hafta_tatili integer,
  ucretsiz_gun integer,
  hak_edis numeric,
  ek_odeme numeric,
  duzeltme numeric,
  duzeltme_aciklama text,
  toplam numeric,
  odendi_tarihi date
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_bas date := date_trunc('month', p_donem)::date;
  v_son date := (date_trunc('month', p_donem) + interval '1 month - 1 day')::date;
begin
  if not public.maas_gorur() then raise exception 'Bu bilgiyi görme yetkiniz yok'; end if;

  return query
  with gunler as (
    select pu.*, u.ucret_tipi, u.tutar as ucret
      from public.puantaj pu
      left join lateral (
        select x.ucret_tipi, x.tutar from public.personel_ucretleri x
         where x.personel_id = pu.personel_id and x.baslangic <= pu.tarih
         order by x.baslangic desc limit 1) u on true
     where pu.tarih between v_bas and v_son
  ),
  ozet as (
    select g.personel_id,
           count(*) filter (where g.miktar > 0)::int as gelinen,
           sum(case when g.ucret_tipi = 'gunluk' then greatest(g.miktar - 1, 0) else 0 end) as fazla,
           coalesce(sum(g.miktar), 0) as miktar,
           count(*) filter (where g.gun_turu = 'eksik')::int as eksik,
           count(*) filter (where g.gun_turu = 'izinli')::int as izinli,
           count(*) filter (where g.gun_turu = 'raporlu')::int as raporlu,
           count(*) filter (where g.gun_turu = 'resmi_tatil')::int as resmi,
           count(*) filter (where g.gun_turu = 'hafta_tatili')::int as hafta,
           count(*) filter (where g.miktar > 0 and g.ucret is null and g.elle_tutar is null)::int as ucretsiz,
           coalesce(sum(coalesce(g.elle_tutar, round(g.miktar * coalesce(g.ucret, 0), 2))), 0) as hak
      from gunler g group by g.personel_id
  ),
  ek as (
    select e.personel_id,
           sum(case e.birim
                 when 'aylik' then e.tutar
                 else e.tutar * (select count(*) from public.puantaj p2
                                  where p2.personel_id = e.personel_id and p2.miktar > 0
                                    and p2.tarih between greatest(v_bas, e.baslangic) and least(v_son, coalesce(e.bitis, v_son)))
               end) as tutar
      from public.personel_ek_odemeleri e
     where e.baslangic <= v_son and (e.bitis is null or e.bitis >= v_bas)
     group by e.personel_id
  )
  select p.id, p.ad_soyad, p.durum,
         (select x.ucret_tipi from public.personel_ucretleri x
           where x.personel_id = p.id and x.baslangic <= v_son order by x.baslangic desc limit 1),
         coalesce(o.gelinen, 0), coalesce(o.fazla, 0), coalesce(o.miktar, 0),
         coalesce(o.eksik, 0), coalesce(o.izinli, 0), coalesce(o.raporlu, 0),
         coalesce(o.resmi, 0), coalesce(o.hafta, 0), coalesce(o.ucretsiz, 0),
         coalesce(o.hak, 0), coalesce(ek.tutar, 0), coalesce(m.duzeltme, 0), m.duzeltme_aciklama,
         coalesce(o.hak, 0) + coalesce(ek.tutar, 0) + coalesce(m.duzeltme, 0),
         m.odendi_tarihi
    from public.personeller p
    left join ozet o on o.personel_id = p.id
    left join ek on ek.personel_id = p.id
    left join public.maas_aylik m on m.personel_id = p.id and m.donem = v_bas
   where o.personel_id is not null
      or (p.durum = 'calisiyor' and (p.ise_baslama is null or p.ise_baslama <= v_son))
      or (p.durum = 'ayrildi' and p.ayrilis between v_bas and v_son)
   order by p.ad_soyad;
end;
$$;

revoke execute on function public.maas_ay_ozeti(date) from public, anon;
grant execute on function public.maas_ay_ozeti(date) to authenticated;
