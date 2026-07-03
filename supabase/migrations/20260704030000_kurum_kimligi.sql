-- Kooperatif adi ve logosu - ust barda ve giris ekraninda gosterilecek.
alter table public.ayarlar
  add column kurum_adi text not null default 'Suluova Üreten Eller Kadın Kooperatifi',
  add column logo_url text;

-- Logo herkese acik olarak gorunecegi icin public bucket (fis gibi hassas degil).
insert into storage.buckets (id, name, public)
values ('kurum', 'kurum', true)
on conflict (id) do nothing;

create policy "Herkes logoyu gorebilir" on storage.objects
  for select using (bucket_id = 'kurum');

create policy "Giris yapan logo yukleyebilir" on storage.objects
  for insert with check (bucket_id = 'kurum' and auth.uid() is not null);

create policy "Giris yapan logo guncelleyebilir" on storage.objects
  for update using (bucket_id = 'kurum' and auth.uid() is not null);
