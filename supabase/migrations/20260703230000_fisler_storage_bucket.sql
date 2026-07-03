-- Fis/fatura gorselleri icin depolama alani (OCR modulu)
insert into storage.buckets (id, name, public)
values ('fisler', 'fisler', false)
on conflict (id) do nothing;

create policy "Giris yapan fis yukleyebilir" on storage.objects
  for insert with check (bucket_id = 'fisler' and auth.uid() is not null);

create policy "Giris yapan fisleri gorebilir" on storage.objects
  for select using (bucket_id = 'fisler' and auth.uid() is not null);
