-- Aylık ücret (26 Kas 2026, Nagihan Hanım cevapları): kooperatifte herkes aylık asgari ücretle çalışıyor,
-- günlük/saatlik ücretli yok. Kural:
--   * Ay kaç gün çekerse çeksin (28/30/31) ücret sabit; kesinti yoksa tam ödenir.
--   * Kesinti = ücret / 30 × (kesilen gün); 1 gün = 8 saat. Yarım gün ve saat kesintisi de aynı kuralla.
--   * Resmi tatil, hafta tatili ve "İzinli" günlerde kesinti yok; "Eksik gün" ve "Raporlu" günlerde kesinti var.
--   * Ay ortasında işe giren/ayrılan: çalıştığı takvim günü / 30 (en çok 30).
-- Puantajda aylık ücretlide "miktar" = o gün çalıştığı SAAT (tam gün 8). Kesilen saat = 8 - miktar
-- (yalnız Çalıştı / Eksik gün / Raporlu günlerde; en az 0). Yol parası kuralı değişmedi (miktar > 0 olan gün).
-- Mevcut kayıtlar değişmez; günlük/saatlik ücretliler eskisi gibi hesaplanır.

alter table public.personel_ucretleri drop constraint personel_ucretleri_ucret_tipi_check;
alter table public.personel_ucretleri
  add constraint personel_ucretleri_ucret_tipi_check check (ucret_tipi in ('gunluk', 'saatlik', 'aylik'));

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
  with kisi as (
    -- Ayın ücret tipi ay sonunda geçerli olan satırdan gelir; aylıkta ay ortası zam desteklenmez
    -- (zam ay başından geçerli olacak şekilde girilir).
    select p.id,
           (select x.ucret_tipi from public.personel_ucretleri x
             where x.personel_id = p.id and x.baslangic <= v_son order by x.baslangic desc limit 1) as tip,
           (select x.tutar from public.personel_ucretleri x
             where x.personel_id = p.id and x.baslangic <= v_son order by x.baslangic desc limit 1) as tutar,
           greatest(v_bas, coalesce(p.ise_baslama, v_bas)) as bas,
           least(v_son, case when p.durum = 'ayrildi' then coalesce(p.ayrilis, v_son) else v_son end) as bit
      from public.personeller p
  ),
  gunler as (
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
           coalesce(sum(case when g.ucret_tipi = 'aylik' then 0
                             else coalesce(g.elle_tutar, round(g.miktar * coalesce(g.ucret, 0), 2)) end), 0) as hak,
           coalesce(sum(case when g.gun_turu in ('calisti', 'eksik', 'raporlu') then greatest(8 - g.miktar, 0) else 0 end), 0) as kesilen_saat
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
  ),
  -- Aylık ücretli: tam ay çalıştıysa 30 gün, kısmi ayda takvim günü (en çok 30); kesinti ücret/30 × kesilen gün.
  aylik as (
    select k.id,
           round(k.tutar / 30 * (
             case when k.bas = v_bas and k.bit = v_son then 30 else least(30, greatest(k.bit - k.bas + 1, 0)) end
             - coalesce(o.kesilen_saat, 0) / 8), 2) as hak
      from kisi k left join ozet o on o.personel_id = k.id
     where k.tip = 'aylik'
  )
  select p.id, p.ad_soyad, p.durum, k.tip,
         coalesce(o.gelinen, 0), coalesce(o.fazla, 0), coalesce(o.miktar, 0),
         coalesce(o.eksik, 0), coalesce(o.izinli, 0), coalesce(o.raporlu, 0),
         coalesce(o.resmi, 0), coalesce(o.hafta, 0),
         case when k.tip = 'aylik' then 0 else coalesce(o.ucretsiz, 0) end,
         coalesce(a.hak, o.hak, 0), coalesce(ek.tutar, 0), coalesce(m.duzeltme, 0), m.duzeltme_aciklama,
         coalesce(a.hak, o.hak, 0) + coalesce(ek.tutar, 0) + coalesce(m.duzeltme, 0),
         m.odendi_tarihi
    from public.personeller p
    join kisi k on k.id = p.id
    left join ozet o on o.personel_id = p.id
    left join aylik a on a.id = p.id
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
