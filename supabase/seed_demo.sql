-- One explicitly marked sample for the municipal Day of the Dead form.
-- Run after schema.sql and after creating the first administrator.

do $$
declare
  demo_author uuid;
begin
  select id into demo_author
  from public.profiles
  where role = 'admin'::public.app_role
  order by created_at
  limit 1;

  if demo_author is null then
    raise exception 'Create the first administrator before loading the demo fixture.';
  end if;

  insert into public.traditions (
    id,
    author_id,
    entry_type,
    title,
    municipality,
    tradition_author,
    celebration_origin_history,
    celebration_customs,
    celebration_social_importance,
    celebration_conclusion,
    image_path,
    sources,
    status
  )
  values (
    '10000000-0000-4000-8000-000000000001',
    demo_author,
    'celebration',
    'DEMO — Día de Muertos en un municipio por investigar',
    'Municipio por investigar',
    'Ejemplo demostrativo',
    'Ejemplo DEMO: investigar y escribir el origen y la historia de la celebración del Día de Muertos en el municipio elegido.',
    'Ejemplo DEMO: documentar las costumbres y actividades tradicionales con testimonios y fuentes.',
    'Ejemplo DEMO: explicar cómo participa la comunidad y qué importancia social tiene esta celebración.',
    'Ejemplo DEMO: concluir qué se aprendió y por qué es importante conservar esta tradición.',
    'demo:portada-guerrero.svg',
    array['DEMO — Reemplazar por libros, documentos, páginas confiables o testimonios consultados.'],
    'approved'
  )
  on conflict (id) do nothing;
end
$$;
