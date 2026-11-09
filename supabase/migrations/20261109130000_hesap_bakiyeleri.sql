-- Her hesabın toplam borç / alacak / bakiyesi. Grup hesapları (120, 120.01)
-- altındaki bütün alt hesapların toplamını gösterir. Cari bakiyesi, hesap planı
-- ekranı ve mizan bu görünümden okur. security_invoker: okuyanın yetkisiyle
-- çalışır, RLS atlanmaz.
create view public.hesap_bakiyeleri with (security_invoker = true) as
select h.kod,
       coalesce(sum(s.borc), 0)::numeric(14,2) as borc,
       coalesce(sum(s.alacak), 0)::numeric(14,2) as alacak,
       (coalesce(sum(s.borc), 0) - coalesce(sum(s.alacak), 0))::numeric(14,2) as bakiye
  from public.hesap_plani h
  left join public.yevmiye_satirlari s
    on s.hesap_kodu = h.kod or s.hesap_kodu like h.kod || '.%'
 group by h.kod;
