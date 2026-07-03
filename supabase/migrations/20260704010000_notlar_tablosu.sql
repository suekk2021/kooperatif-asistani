-- Serbest, tarihsiz sesli/yazili notlar - olusturuldugu an sunucu saatiyle damgalanir.
create table public.notlar (
  id uuid primary key default gen_random_uuid(),
  icerik text not null,
  kaynak text not null default 'telegram' check (kaynak in ('telegram', 'web')),
  olusturan uuid references public.profiller(id),
  created_at timestamptz not null default now()
);

create index notlar_created_at_idx on public.notlar (created_at desc);

alter table public.notlar enable row level security;

create policy "Giris yapan notlari okuyabilir" on public.notlar
  for select using (auth.uid() is not null);

create policy "Giris yapan not ekleyebilir" on public.notlar
  for insert with check (auth.uid() is not null);
