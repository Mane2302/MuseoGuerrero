-- Borradores de fichas con guardado automático.
-- Crea una tabla nueva e independiente: NO modifica public.traditions ni las fichas ya enviadas.
-- El id de cada borrador es el mismo id que tendrá (o ya tiene) la ficha en public.traditions,
-- lo que permite que un envío repetido no cree fichas duplicadas.

create table if not exists public.tradition_drafts (
  id uuid primary key,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tradition_drafts_content_size check (octet_length(content::text) <= 100000),
  constraint tradition_drafts_image_owner check (
    image_path is null or image_path like (author_id::text || '/%')
  )
);

create index if not exists tradition_drafts_author_date_idx
  on public.tradition_drafts (author_id, updated_at desc);

create or replace function public.update_tradition_draft_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.id := old.id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tradition_drafts_set_updated_at on public.tradition_drafts;
create trigger tradition_drafts_set_updated_at
  before update on public.tradition_drafts
  for each row execute procedure public.update_tradition_draft_timestamps();

alter table public.tradition_drafts enable row level security;

drop policy if exists "Students read their own drafts" on public.tradition_drafts;
create policy "Students read their own drafts"
  on public.tradition_drafts for select to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Students create their own drafts" on public.tradition_drafts;
create policy "Students create their own drafts"
  on public.tradition_drafts for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "Students update their own drafts" on public.tradition_drafts;
create policy "Students update their own drafts"
  on public.tradition_drafts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Students delete their own drafts" on public.tradition_drafts;
create policy "Students delete their own drafts"
  on public.tradition_drafts for delete to authenticated
  using (author_id = (select auth.uid()));

revoke all on public.tradition_drafts from anon, authenticated;
grant select, insert, update, delete on public.tradition_drafts to authenticated;

notify pgrst, 'reload schema';
