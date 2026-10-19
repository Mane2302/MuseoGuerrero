-- Ecos de Guerrero: schema, authorization, and private image storage.
-- Run this file in the Supabase SQL Editor using a project-owner account.

do $$
begin
  create type public.app_role as enum ('student', 'admin');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.tradition_status as enum (
    'pending',
    'approved',
    'rejected',
    'changes_requested'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists public.traditions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  category text not null constraint traditions_category_check check (category in (
    'Artesanía',
    'Danza',
    'Gastronomía',
    'Lengua',
    'Música',
    'Fiesta y celebración',
    'Memoria histórica',
    'Conocimiento tradicional',
    'Otro'
  )),
  municipality text not null check (char_length(municipality) between 2 and 100),
  region text not null check (region in (
    'Acapulco',
    'Centro',
    'Costa Chica',
    'Costa Grande',
    'Montaña',
    'Norte',
    'Tierra Caliente'
  )),
  tradition_author text not null constraint traditions_tradition_author_length
    check (char_length(tradition_author) between 2 and 120),
  description text not null check (char_length(description) between 20 and 1200),
  history text not null check (char_length(history) between 20 and 2000),
  cultural_significance text not null check (char_length(cultural_significance) between 20 and 2000),
  historical_connection text not null constraint traditions_historical_connection_length
    check (char_length(historical_connection) between 20 and 2000),
  image_path text not null,
  sources text[] not null check (cardinality(sources) > 0),
  status public.tradition_status not null default 'pending',
  review_note text,
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.traditions
  add column if not exists tradition_author text not null default 'Autoría sin registrar';

alter table public.traditions
  add column if not exists historical_connection text;

update public.traditions
set historical_connection = 'Ficha anterior a la actividad. Completar este apartado con fuentes sobre la memoria de la Independencia en Guerrero y la tradición del Día de Muertos.'
where historical_connection is null or btrim(historical_connection) = '';

alter table public.traditions
  alter column historical_connection set not null;

alter table public.traditions
  drop constraint if exists traditions_historical_connection_length;

alter table public.traditions
  add constraint traditions_historical_connection_length
  check (char_length(historical_connection) between 20 and 2000);

alter table public.traditions
  drop constraint if exists traditions_category_check;

alter table public.traditions
  add constraint traditions_category_check
  check (category in (
    'Artesanía',
    'Danza',
    'Gastronomía',
    'Lengua',
    'Música',
    'Fiesta y celebración',
    'Memoria histórica',
    'Conocimiento tradicional',
    'Otro'
  ));

create index if not exists traditions_publication_date_idx
  on public.traditions (status, created_at desc);
create index if not exists traditions_author_date_idx
  on public.traditions (author_id, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.app_role
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Estudiante'
    ),
    'student'::public.app_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_student_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_student_profile();

create or replace function public.update_tradition_timestamps()
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

  if new.status is distinct from old.status then
    if new.status in (
      'approved'::public.tradition_status,
      'rejected'::public.tradition_status,
      'changes_requested'::public.tradition_status
    ) then
      new.reviewer_id := (select auth.uid());
      new.reviewed_at := now();
    else
      new.reviewer_id := null;
      new.reviewed_at := null;
      new.review_note := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists traditions_set_updated_at on public.traditions;
create trigger traditions_set_updated_at
  before update on public.traditions
  for each row execute procedure public.update_tradition_timestamps();

alter table public.profiles enable row level security;
alter table public.traditions enable row level security;

drop policy if exists "Profiles can be read by their owner or an admin" on public.profiles;
create policy "Profiles can be read by their owner or an admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Users can update their own display name" on public.profiles;
create policy "Users can update their own display name"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "Approved, owned, or admin-visible traditions" on public.traditions;
create policy "Approved, owned, or admin-visible traditions"
  on public.traditions for select to anon, authenticated
  using (
    status = 'approved'::public.tradition_status
    or author_id = (select auth.uid())
    or (select public.is_admin())
  );

drop policy if exists "Students create their own pending traditions" on public.traditions;
create policy "Students create their own pending traditions"
  on public.traditions for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and image_path like ((select auth.uid())::text || '/%')
    and status = 'pending'::public.tradition_status
    and reviewer_id is null
    and reviewed_at is null
    and review_note is null
  );

drop policy if exists "Students edit their own unreviewed traditions" on public.traditions;
create policy "Students edit their own unreviewed traditions"
  on public.traditions for update to authenticated
  using (
    author_id = (select auth.uid())
    and image_path like ((select auth.uid())::text || '/%')
    and status in (
      'pending'::public.tradition_status,
      'changes_requested'::public.tradition_status
    )
  )
  with check (
    author_id = (select auth.uid())
    and image_path like ((select auth.uid())::text || '/%')
    and status = 'pending'::public.tradition_status
    and reviewer_id is null
    and reviewed_at is null
    and review_note is null
  );

drop policy if exists "Admins can review any tradition" on public.traditions;
create policy "Admins can review any tradition"
  on public.traditions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete any tradition" on public.traditions;
create policy "Admins can delete any tradition"
  on public.traditions for delete to authenticated
  using ((select public.is_admin()));

revoke all on public.traditions from anon, authenticated;
grant select on public.traditions to anon, authenticated;
grant insert, update, delete on public.traditions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tradition-images',
  'tradition-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload their own tradition images" on storage.objects;
create policy "Owners upload their own tradition images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tradition-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

drop policy if exists "Owners, admins, and approved traditions can read images" on storage.objects;
create policy "Owners, admins, and approved traditions can read images"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'tradition-images'
    and (
      (
        (select auth.uid()) is not null
        and (
          (storage.foldername(name))[1] = (select auth.uid())::text
          or (select public.is_admin())
        )
      )
      or exists (
        select 1
        from public.traditions as tradition
        where tradition.image_path = storage.objects.name
          and tradition.status = 'approved'::public.tradition_status
      )
    )
  );

drop policy if exists "Owners and admins delete tradition images" on storage.objects;
create policy "Owners and admins delete tradition images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tradition-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );
