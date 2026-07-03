-- Giris ekrani (oturum acilmadan once) kurum adini ve logosunu gosterebilsin diye
-- ayarlar tablosunun tamamini degil, sadece bu iki sutunu acan bir view.
create view public.kurum_kimligi as
  select kurum_adi, logo_url from public.ayarlar where id = true;

grant select on public.kurum_kimligi to anon, authenticated;
