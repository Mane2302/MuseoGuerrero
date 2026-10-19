-- Apply to an existing database to add the ficha-level author field.
alter table public.traditions
  add column if not exists tradition_author text not null default 'Autoría sin registrar';

alter table public.traditions
  drop constraint if exists traditions_tradition_author_length;

alter table public.traditions
  add constraint traditions_tradition_author_length
  check (char_length(tradition_author) between 2 and 120);

notify pgrst, 'reload schema';
