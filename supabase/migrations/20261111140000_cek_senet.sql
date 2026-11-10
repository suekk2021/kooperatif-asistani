-- Çek / senet (Zafer Kara gözden geçirmesi; kullanıcı 11 Kas 2026: "kullanılıyor mu bilmiyorum ama yapalım")
--
-- Alınan (müşteriden):  101.01 Portföydeki Çekler / 121.01 Portföydeki Senetler
--   giriş        B 101.01|121.01 / A müşteri          → portföyde
--   tahsil       B kasa|banka    / A 101.01|121.01     → tahsil edildi
--   ciro         B tedarikçi     / A 101.01|121.01     → ciro edildi (tedarikçiye ödeme olarak verildi)
--   karşılıksız  B müşteri       / A 101.01|121.01     → karşılıksız (alacak müşteriye geri yazılır)
-- Verilen (bizim):     103.01 Verilen Çekler / 321.01 Borç Senetleri
--   giriş        B tedarikçi     / A 103.01|321.01     → ödenmedi
--   ödeme        B 103.01|321.01 / A kasa|banka        → ödendi
-- Her adım ayrı hareket + fiş. Yalnız SON hareket iptal edilir (ters fiş); evrak bir önceki duruma döner.
-- Girişin iptali evrakı iptal eder.

insert into public.hesap_plani (kod, ad, sistem) values
  ('101.01', 'Portföydeki Çekler', true),
  ('103.01', 'Verilen Çekler', true),
  ('121.01', 'Portföydeki Senetler', true),
  ('321.01', 'Borç Senetleri', true)
on conflict (kod) do nothing;

create table public.evraklar (
  id uuid primary key default gen_random_uuid(),
  evrak_no bigint generated always as identity unique,
  tur text not null check (tur in ('cek', 'senet')),
  yon text not null check (yon in ('alinan', 'verilen')),
  cari_id uuid not null references public.cariler(id),
  tutar numeric(14,2) not null check (tutar > 0),
  vade date not null,
  seri_no text,
  banka text,
  sube text,
  borclu text,
  aciklama text,
  durum text not null default 'portfoyde'
    check (durum in ('portfoyde', 'tahsil', 'ciro', 'karsiliksiz', 'odenmedi', 'odendi', 'iptal')),
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index evraklar_vade_idx on public.evraklar (vade) where durum in ('portfoyde', 'odenmedi');

create table public.evrak_hareketleri (
  id uuid primary key default gen_random_uuid(),
  sira bigint generated always as identity unique,
  evrak_id uuid not null references public.evraklar(id),
  islem text not null check (islem in ('giris', 'tahsil', 'ciro', 'karsiliksiz', 'odeme')),
  tarih date not null,
  hesap_id uuid references public.kasa_banka_hesaplari(id),
  cari_id uuid references public.cariler(id),
  onceki_durum text,
  durum text not null default 'kayitli' check (durum in ('kayitli', 'iptal')),
  iptal_nedeni text,
  fis_id uuid references public.yevmiye_fisleri(id),
  iptal_fis_id uuid references public.yevmiye_fisleri(id),
  olusturan uuid references public.profiller(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index evrak_hareketleri_evrak_idx on public.evrak_hareketleri (evrak_id);

alter table public.yevmiye_fisleri drop constraint yevmiye_fisleri_kaynak_tur_check;
alter table public.yevmiye_fisleri add constraint yevmiye_fisleri_kaynak_tur_check check (kaynak_tur in
  ('acilis', 'alis', 'satis', 'uretim', 'tahsilat', 'odeme', 'virman', 'sayim', 'manuel', 'iptal', 'iade', 'evrak'));

create trigger evraklar_kayit after insert or update or delete on public.evraklar
  for each row execute function public.degisiklik_kaydet();
create trigger evrak_hareketleri_kayit after insert or update or delete on public.evrak_hareketleri
  for each row execute function public.degisiklik_kaydet();

alter table public.evraklar enable row level security;
alter table public.evrak_hareketleri enable row level security;
create policy "Giris yapan okur" on public.evraklar for select using (auth.uid() is not null);
create policy "Giris yapan okur" on public.evrak_hareketleri for select using (auth.uid() is not null);

create or replace function public.evrak_hesabi(e public.evraklar)
returns text language sql immutable as $$
  select case
    when e.yon = 'alinan' and e.tur = 'cek' then '101.01'
    when e.yon = 'alinan' then '121.01'
    when e.tur = 'cek' then '103.01'
    else '321.01' end;
$$;

-- Bir adımı uygular: hareket + fiş + evrak durumu. İç kullanım (yetki çağıranda).
create or replace function public.evrak_adim(p_evrak uuid, p_islem text, p_tarih date, p_hesap uuid, p_cari uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e public.evraklar; v_hesap_kod text; v_cari public.cariler; v_evrak_kod text; v_ad text;
  v_borc text; v_alacak text; v_yeni text; v_id uuid; v_fis uuid; v_gecerli text[];
begin
  select * into e from public.evraklar where id = p_evrak for update;
  if not found then raise exception 'Evrak bulunamadı'; end if;
  v_evrak_kod := public.evrak_hesabi(e);
  v_ad := case e.tur when 'cek' then 'Çek' else 'Senet' end || ' #' || e.evrak_no || coalesce(' (' || e.seri_no || ')', '');

  v_gecerli := case p_islem
    when 'tahsil' then array['portfoyde'] when 'ciro' then array['portfoyde'] when 'karsiliksiz' then array['portfoyde']
    when 'odeme' then array['odenmedi'] else array[]::text[] end;
  if p_islem <> 'giris' and not (e.durum = any (v_gecerli)) then
    raise exception 'Bu evrak "%" durumunda; bu işlem yapılamaz', e.durum;
  end if;
  if p_islem in ('tahsil', 'ciro', 'karsiliksiz') and e.yon <> 'alinan' then raise exception 'Bu işlem yalnız alınan evrakta yapılır'; end if;
  if p_islem = 'odeme' and e.yon <> 'verilen' then raise exception 'Ödeme yalnız verilen evrakta yapılır'; end if;

  if p_islem in ('tahsil', 'odeme') then
    select kod into v_hesap_kod from public.kasa_banka_hesaplari where id = p_hesap and aktif and tur in ('kasa', 'banka');
    if v_hesap_kod is null then raise exception 'Kasa veya banka hesabı seçin'; end if;
  end if;
  if p_islem = 'ciro' then
    select * into v_cari from public.cariler where id = p_cari and aktif and tur = 'tedarikci';
    if not found then raise exception 'Ciro edilecek tedarikçiyi seçin'; end if;
  else
    select * into v_cari from public.cariler where id = e.cari_id;
  end if;

  if p_islem = 'giris' and e.yon = 'alinan' then v_borc := v_evrak_kod; v_alacak := v_cari.kod; v_yeni := 'portfoyde';
  elsif p_islem = 'giris' then v_borc := v_cari.kod; v_alacak := v_evrak_kod; v_yeni := 'odenmedi';
  elsif p_islem = 'tahsil' then v_borc := v_hesap_kod; v_alacak := v_evrak_kod; v_yeni := 'tahsil';
  elsif p_islem = 'ciro' then v_borc := v_cari.kod; v_alacak := v_evrak_kod; v_yeni := 'ciro';
  elsif p_islem = 'karsiliksiz' then v_borc := v_cari.kod; v_alacak := v_evrak_kod; v_yeni := 'karsiliksiz';
  elsif p_islem = 'odeme' then v_borc := v_evrak_kod; v_alacak := v_hesap_kod; v_yeni := 'odendi';
  else raise exception 'Bilinmeyen işlem'; end if;

  insert into public.evrak_hareketleri (evrak_id, islem, tarih, hesap_id, cari_id, onceki_durum)
  values (e.id, p_islem, p_tarih, p_hesap, case when p_islem = 'ciro' then p_cari else e.cari_id end, e.durum)
  returning id into v_id;

  v_fis := public.fis_olustur(p_tarih,
    v_ad || ' · ' || case p_islem when 'giris' then case e.yon when 'alinan' then 'alındı' else 'verildi' end
      when 'tahsil' then 'tahsil edildi' when 'ciro' then 'ciro edildi' when 'karsiliksiz' then 'karşılıksız'
      else 'ödendi' end || ' · ' || v_cari.unvan,
    'evrak', v_id,
    jsonb_build_array(jsonb_build_object('hesap_kodu', v_borc, 'borc', e.tutar),
                      jsonb_build_object('hesap_kodu', v_alacak, 'alacak', e.tutar)));
  update public.evrak_hareketleri set fis_id = v_fis where id = v_id;
  update public.evraklar set durum = v_yeni where id = e.id;
  return v_id;
end;
$$;

-- p: {"tur":"cek|senet","yon":"alinan|verilen","cari_id","tutar","vade","tarih","seri_no","banka","sube","borclu","aciklama"}
create or replace function public.evrak_kaydet(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_cari public.cariler; v_yon text := p->>'yon';
begin
  perform public.islem_izni_kontrol('kasa');
  if p->>'tur' not in ('cek', 'senet') then raise exception 'Çek mi senet mi seçin'; end if;
  if v_yon not in ('alinan', 'verilen') then raise exception 'Alınan mı verilen mi seçin'; end if;
  select * into v_cari from public.cariler where id = (p->>'cari_id')::uuid and aktif;
  if not found then raise exception 'Cari seçin'; end if;
  if v_yon = 'alinan' and v_cari.tur <> 'musteri' then raise exception 'Alınan çek/senet bir müşteriden gelir'; end if;
  if v_yon = 'verilen' and v_cari.tur <> 'tedarikci' then raise exception 'Verilen çek/senet bir tedarikçiye gider'; end if;
  if coalesce((p->>'tutar')::numeric, 0) <= 0 then raise exception 'Tutar sıfırdan büyük olmalı'; end if;
  if nullif(p->>'vade', '') is null then raise exception 'Vade tarihi girin'; end if;

  insert into public.evraklar (tur, yon, cari_id, tutar, vade, seri_no, banka, sube, borclu, aciklama)
  values (p->>'tur', v_yon, v_cari.id, round((p->>'tutar')::numeric, 2), (p->>'vade')::date,
          nullif(trim(p->>'seri_no'), ''), nullif(trim(p->>'banka'), ''), nullif(trim(p->>'sube'), ''),
          nullif(trim(p->>'borclu'), ''), nullif(trim(p->>'aciklama'), ''))
  returning id into v_id;
  perform public.evrak_adim(v_id, 'giris', coalesce((p->>'tarih')::date, current_date), null, null);
  return v_id;
end;
$$;

-- p: {"islem":"tahsil|ciro|karsiliksiz|odeme","tarih","hesap_id","cari_id"}
create or replace function public.evrak_islem(p_evrak uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public.islem_izni_kontrol('kasa');
  if p->>'islem' not in ('tahsil', 'ciro', 'karsiliksiz', 'odeme') then raise exception 'İşlem seçin'; end if;
  return public.evrak_adim(p_evrak, p->>'islem', coalesce((p->>'tarih')::date, current_date),
                           nullif(p->>'hesap_id', '')::uuid, nullif(p->>'cari_id', '')::uuid);
end;
$$;

-- Yalnız son kayıtlı hareket iptal edilir; evrak önceki durumuna döner (giriş iptali → evrak iptal).
create or replace function public.evrak_hareketi_iptal(p_id uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare h public.evrak_hareketleri; v_iptal uuid;
begin
  perform public.islem_izni_kontrol('kasa');
  perform public.iptal_izni_kontrol('evrak_hareketleri', p_id);
  if nullif(trim(p_neden), '') is null then raise exception 'İptal nedeni yazılmalı'; end if;
  select * into h from public.evrak_hareketleri where id = p_id for update;
  if not found or h.durum <> 'kayitli' then raise exception 'Hareket bulunamadı veya zaten iptal'; end if;
  if exists (select 1 from public.evrak_hareketleri
              where evrak_id = h.evrak_id and durum = 'kayitli' and sira > h.sira) then
    raise exception 'Önce bu evrakın son işlemini iptal edin';
  end if;
  v_iptal := public.fis_iptal(h.fis_id, 'Evrak işlemi iptali: ' || p_neden);
  update public.evrak_hareketleri set durum = 'iptal', iptal_nedeni = p_neden, iptal_fis_id = v_iptal where id = p_id;
  update public.evraklar set durum = case when h.islem = 'giris' then 'iptal' else h.onceki_durum end where id = h.evrak_id;
end;
$$;

create or replace function public.iptal_izni_kontrol(p_tablo text, p_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare v_olusturan uuid; v_zaman timestamptz;
begin
  if p_tablo not in ('para_hareketleri', 'alis_faturalari', 'satis_faturalari', 'uretim_partileri', 'sayimlar',
                     'yevmiye_fisleri', 'iadeler', 'evrak_hareketleri') then
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

revoke execute on function public.evrak_adim(uuid, text, date, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.evrak_kaydet(jsonb) from public, anon;
revoke execute on function public.evrak_islem(uuid, jsonb) from public, anon;
revoke execute on function public.evrak_hareketi_iptal(uuid, text) from public, anon;
grant execute on function public.evrak_kaydet(jsonb) to authenticated;
grant execute on function public.evrak_islem(uuid, jsonb) to authenticated;
grant execute on function public.evrak_hareketi_iptal(uuid, text) to authenticated;
