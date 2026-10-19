-- Store each student's documented comparison for the Independence and Day of the Dead activity.
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

notify pgrst, 'reload schema';
