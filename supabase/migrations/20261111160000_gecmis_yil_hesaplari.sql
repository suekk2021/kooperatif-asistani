-- Açılış bakiyelerinin karşı hesabı için TDHP'nin standart hesapları (mali müşavir hangisini derse o seçilir).
insert into public.hesap_plani (kod, ad, sistem) values
  ('570', 'Geçmiş Yıllar Kârları', true),
  ('580', 'Geçmiş Yıllar Zararları', true)
on conflict (kod) do nothing;
