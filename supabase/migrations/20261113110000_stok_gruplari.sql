-- Stok grupları (13 Kas 2026, Fatih Bey isteği): stok kodu 150.10.001 biçiminde = ana hesap + GRUP + kart sırası.
-- Gruplar koda gömülü değil, tabloda tutulur; ekleme/düzenleme yalnız operasyon yöneticisi ve bilgi işlemde.
-- Kart, açıldığı grubun türünde olmak zorundadır; kod ve grup sonradan değişmez (muhasebe kaydı o koda bağlı).

create or replace function public.stok_grup_yetkili()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol::text in ('operasyon', 'bilgi_islem', 'destek'));
$$;

create table public.stok_gruplari (
  id uuid primary key default gen_random_uuid(),
  ana_kod text not null check (ana_kod in ('150', '151', '152', '153')),
  grup_kodu text not null check (grup_kodu ~ '^[0-9]{2}$'),
  ad text not null check (length(trim(ad)) > 0),
  tur public.stok_turu not null,
  aktif boolean not null default true,
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (ana_kod, grup_kodu),
  check (
    (ana_kod = '150' and tur in ('hammadde', 'ambalaj', 'yardimci')) or
    (ana_kod = '151' and tur = 'yari_mamul') or
    (ana_kod = '152' and tur = 'mamul') or
    (ana_kod = '153' and tur = 'ticari_mal')
  )
);

-- Grup eklenince/adı değişince hesap planında üst hesabı (150.10) açılır/güncellenir.
create or replace function public.stok_grubu_hesabi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.ana_kod <> old.ana_kod or new.grup_kodu <> old.grup_kodu then
      raise exception 'Grubun kodu değiştirilemez';
    end if;
    if new.tur <> old.tur and exists (select 1 from public.stok_kartlari where grup_id = old.id) then
      raise exception 'Bu grupta kart var; türü değiştirilemez';
    end if;
  end if;
  insert into public.hesap_plani (kod, ad) values (new.ana_kod || '.' || new.grup_kodu, new.ad)
    on conflict (kod) do update set ad = excluded.ad;
  return new;
end;
$$;
create trigger stok_gruplari_hesap before insert or update on public.stok_gruplari
  for each row execute function public.stok_grubu_hesabi();
create trigger stok_gruplari_kayit after insert or update or delete on public.stok_gruplari
  for each row execute function public.degisiklik_kaydet();

alter table public.stok_gruplari enable row level security;
create policy "Giris yapan okur" on public.stok_gruplari for select using (auth.uid() is not null);
create policy "Stok grubu yetkilisi ekler" on public.stok_gruplari for insert with check (public.stok_grup_yetkili());
create policy "Stok grubu yetkilisi duzenler" on public.stok_gruplari for update using (public.stok_grup_yetkili());

-- Mevcut sabit gruplar (01/02) ve Fatih Bey'in verdiği listeler
insert into public.stok_gruplari (ana_kod, grup_kodu, ad, tur) values
  ('150', '01', 'Hammaddeler', 'hammadde'),
  ('150', '02', 'Ambalaj Malzemeleri', 'ambalaj'),
  ('151', '01', 'Yarı Mamuller', 'yari_mamul'),
  ('152', '01', 'Makarna Mantı Grubu', 'mamul'),
  ('153', '01', 'Ticari Mallar', 'ticari_mal'),
  ('150', '10', 'Hammadde 1. grup', 'hammadde'),
  ('150', '12', 'Hammadde 2. grup', 'hammadde'),
  ('150', '14', 'Hammadde 3. grup', 'hammadde'),
  ('150', '30', 'Ambalaj - etiket', 'ambalaj'),
  ('150', '31', 'Ambalaj - kutu vb', 'ambalaj'),
  ('150', '32', 'Ambalaj - koli', 'ambalaj'),
  ('150', '33', 'Ambalaj - naylon torba streç', 'ambalaj'),
  ('150', '60', 'Temizlik', 'yardimci'),
  ('150', '80', 'Kıyafet', 'yardimci'),
  ('152', '02', 'Sarma', 'mamul'),
  ('152', '03', 'İçli köfte', 'mamul'),
  ('152', '04', 'Gözleme grubu', 'mamul'),
  ('152', '05', 'Çörek grubu', 'mamul'),
  ('152', '11', 'Su böreği', 'mamul'),
  ('152', '12', 'Çiğ börek', 'mamul'),
  ('152', '13', 'Kol böreği', 'mamul');
-- (152.01 sistem hesabı "Mamuller" idi; yukarıdaki trigger adını Makarna Mantı Grubu yaptı.)

-- Kartlar gruba bağlanır; mevcut kartlar kodlarının üst hesabından eşlenir.
alter table public.stok_kartlari add column grup_id uuid references public.stok_gruplari(id);
update public.stok_kartlari k set grup_id = g.id
  from public.stok_gruplari g
 where regexp_replace(k.kod, '\.[0-9]+$', '') = g.ana_kod || '.' || g.grup_kodu;
alter table public.stok_kartlari alter column grup_id set not null;
create index stok_kartlari_grup_idx on public.stok_kartlari (grup_id);

-- Eski 150.01 / 150.02 grupları Fatih Bey'in listesinde yok: kartı yoksa formda görünmesin.
update public.stok_gruplari g set aktif = false
 where ana_kod = '150' and grup_kodu in ('01', '02')
   and not exists (select 1 from public.stok_kartlari k where k.grup_id = g.id);

-- Kart hesabı: stok kartının üst hesabı artık türden değil gruptan gelir.
create or replace function public.kart_hesabi_ac()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ad text; v_ust text; v_grup public.stok_gruplari;
begin
  if tg_table_name = 'cariler' then
    v_ad := new.unvan;
    v_ust := case new.tur when 'musteri' then '120.01' else '320.01' end;
  else
    v_ad := new.ad;
    select * into v_grup from public.stok_gruplari where id = new.grup_id;
    if v_grup.id is null then raise exception 'Stok grubu seçilmedi'; end if;
    if v_grup.tur <> new.tur then
      raise exception 'Kart türü, seçilen grubun türüyle (%) aynı olmalı', v_grup.tur;
    end if;
    v_ust := v_grup.ana_kod || '.' || v_grup.grup_kodu;
  end if;

  if tg_op = 'INSERT' then
    if tg_table_name = 'stok_kartlari' and not v_grup.aktif then
      raise exception 'Bu stok grubu kapalı; kart açılamaz';
    end if;
    if new.kod is null then
      new.kod := public.sonraki_alt_kod(v_ust);
    elsif public.hesap_plani_ust(new.kod) is distinct from v_ust then
      raise exception 'Kod % bu grup için % altında olmalı', new.kod, v_ust;
    end if;
    insert into public.hesap_plani (kod, ad) values (new.kod, v_ad)
      on conflict (kod) do nothing;
  else
    if new.kod <> old.kod or new.tur <> old.tur then
      raise exception 'Kartın kodu ve türü değiştirilemez';
    end if;
    if tg_table_name = 'stok_kartlari' and new.grup_id <> old.grup_id then
      raise exception 'Kartın grubu değiştirilemez';
    end if;
    update public.hesap_plani set ad = v_ad, aktif = new.aktif
     where kod = new.kod and (ad <> v_ad or aktif <> new.aktif);
  end if;
  return new;
end;
$$;

drop function if exists public.stok_ust_kodu(public.stok_turu);
