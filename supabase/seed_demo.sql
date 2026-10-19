-- Optional educational fixtures. These records are explicitly marked as demos
-- and use local illustrations rather than objects in Supabase Storage.
-- Run after creating the first administrator and applying schema.sql.

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
    raise exception 'Create the first administrator before loading the demo fixtures.';
  end if;

  insert into public.traditions (
    id, author_id, title, category, municipality, region, tradition_author, description, history,
    cultural_significance, image_path, sources, status
  )
  values
    (
      '10000000-0000-4000-8000-000000000001', demo_author,
      'DEMO — El telar de cintura amuzgo', 'Artesanía', 'Xochistlahuaca', 'Costa Chica', 'Dato de autoría por completar',
      'Ficha de ejemplo para ilustrar el formato del museo. Cada hilo guarda una historia; las comunidades amuzgas crean huipiles y lienzos en telar de cintura.',
      'Texto demostrativo que debe verificarse y ampliarse con entrevistas y fuentes locales antes de utilizarse como material de investigación.',
      'Ejemplo para explicar cómo documentar el significado de una tradición desde la voz de su comunidad.',
      'demo:telar-amuzgo.svg',
      array['DEMO — Sustituir por entrevista, libro o fuente verificable.'],
      'approved'
    ),
    (
      '10000000-0000-4000-8000-000000000002', demo_author,
      'DEMO — Plata que cuenta historias', 'Artesanía', 'Taxco de Alarcón', 'Norte', 'Dato de autoría por completar',
      'Ficha demostrativa sobre el trabajo artesanal de la plata y su relación con los talleres y la identidad local de Taxco.',
      'Texto de ejemplo. Investiga con artesanas, artesanos y fuentes confiables para documentar la historia particular de cada taller.',
      'Ejemplo para registrar el valor cultural y la creatividad comunitaria.',
      'demo:plateria-taxco.svg',
      array['DEMO — Sustituir por entrevista, libro o fuente verificable.'],
      'approved'
    ),
    (
      '10000000-0000-4000-8000-000000000003', demo_author,
      'DEMO — La danza de los tlacololeros', 'Danza', 'Chilpancingo de los Bravo', 'Centro', 'Dato de autoría por completar',
      'Ejemplo de ficha sobre una danza regional. Documenta sus personajes, música, pasos y las voces de quienes la mantienen viva.',
      'Texto demostrativo para mostrar cómo registrar la transmisión de una tradición sin sustituir el testimonio de sus portadores.',
      'Ejemplo para describir la relación de una expresión cultural con su territorio.',
      'demo:tlacololeros.svg',
      array['DEMO — Sustituir por entrevista, libro o fuente verificable.'],
      'approved'
    ),
    (
      '10000000-0000-4000-8000-000000000004', demo_author,
      'DEMO — La laca de Olinalá', 'Artesanía', 'Olinalá', 'Montaña', 'Dato de autoría por completar',
      'Ficha de muestra sobre el maque de Olinalá. Investiga las técnicas, materiales y motivos con las familias artesanas.',
      'Texto de ejemplo que requiere verificación mediante entrevistas y documentación del oficio.',
      'Ejemplo para mostrar cómo una técnica artesanal forma parte de la memoria y la identidad de una comunidad.',
      'demo:laca-olinala.svg',
      array['DEMO — Sustituir por entrevista, libro o fuente verificable.'],
      'approved'
    )
  on conflict (id) do nothing;
end
$$;
