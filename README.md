# Ecos de Guerrero: De la Patria a la Eternidad

Museo digital educativo centrado en las celebraciones del Día de Muertos en los municipios de Guerrero y las biografías de personajes de la Independencia de México. Usa Next.js, TypeScript, Tailwind CSS y Supabase. Las imágenes se guardan en un bucket privado y solo se muestran mediante URL firmadas conforme a las políticas RLS.

## Funcionalidades

- Catálogo público de fichas **aprobadas**, con búsqueda y filtro por municipio.
- Carrusel de portada con celebraciones municipales del Día de Muertos y personajes de la Independencia.
- Dos formatos de ficha para elegir: celebración municipal del Día de Muertos o ficha biográfica de un personaje de la Independencia.
- Fichas públicas con historia, costumbres, información biográfica, conclusiones y fuentes según el formato elegido; los retratos se muestran completos.
- Registro e inicio de sesión con Supabase Auth; las cuentas nuevas reciben el rol `student`.
- Panel del estudiante para enviar fichas pendientes, consultar su estado, abrir la vista privada de sus envíos en otra pestaña y reenviar correcciones.
- Autoría indicada en cada ficha, mostrada junto al municipio.
- Panel de moderación exclusivo del rol `admin`, con vista previa, edición, aprobación, rechazo, solicitud de cambios y eliminación.
- Límite de 5 MB y formatos JPG, PNG y WebP en imágenes.
- Modo demostración sin Supabase: utiliza fichas e ilustraciones locales marcadas como ejemplos; no guarda cuentas ni publicaciones.

## Requisitos

- Node.js 20.9 o superior.
- Una cuenta de Supabase y un proyecto con PostgreSQL, Auth y Storage.
- npm.

## Preparar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. En el SQL Editor del proyecto, ejecuta el archivo [`supabase/schema.sql`](./supabase/schema.sql). Crea los perfiles al registrarse un usuario, activa RLS para las tablas y configura las políticas del bucket privado `tradition-images`.
3. En **Authentication → URL Configuration**, añade `http://localhost:3000` como URL de sitio y permite `http://localhost:3000/**` como URL de redirección. Añade también el dominio de Vercel para producción.
4. En **Project Settings → API**, copia la URL del proyecto y la clave pública `anon` (o la clave publicable). Copia [`.env.example`](./.env.example) como `.env.local` y sustituye esos dos valores:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica
   ```

   No pongas la clave `service_role` en variables `NEXT_PUBLIC_*`, en el navegador ni en el repositorio. Esta aplicación no la necesita.
5. Decide si exigir confirmación de correo en **Authentication → Providers → Email**. Si está activada, el estudiante debe confirmar su correo antes de iniciar sesión.

Si ya habías aplicado una versión anterior del esquema, abre **Supabase → SQL Editor** y ejecuta las migraciones necesarias en orden: [`supabase/migrations/20261018_add_tradition_author.sql`](./supabase/migrations/20261018_add_tradition_author.sql) para añadir la autoría si todavía no está, [`supabase/migrations/20261019_add_entry_types.sql`](./supabase/migrations/20261019_add_entry_types.sql) para habilitar los dos formatos nuevos y [`supabase/migrations/20261019_adjust_entry_sections.sql`](./supabase/migrations/20261019_adjust_entry_sections.sql) para retirar de la validación los apartados eliminados.

La migración de formatos conserva el contenido anterior, prepara los campos nuevos y devuelve las fichas anteriores a estado **pendiente** para que se actualicen y revisen antes de publicarse con el nuevo formato. La migración de apartados conserva también los valores históricos de las secciones retiradas, pero permite guardar las fichas sin volver a pedirlos. Espera unos segundos para que PostgREST recargue el esquema antes de volver a guardar fichas. Ejecuta las migraciones en el proyecto indicado por `NEXT_PUBLIC_SUPABASE_URL`; actualizar el código no modifica la base de datos.

### Crear la primera cuenta administradora

1. Inicia la aplicación con las variables de Supabase, abre `/login` y crea la cuenta con el correo institucional del profesor. Confirma el correo si el proyecto lo requiere.
2. En el SQL Editor de Supabase, ejecuta el siguiente comando sustituyendo el correo por el de esa cuenta:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id from auth.users where email = 'profesor@escuela.edu'
   )
   and role = 'student'
   returning id, display_name, role;
   ```

3. Confirma que devuelve exactamente una fila con rol `admin`. Cierra e inicia sesión de nuevo; el panel `/profesor` ya estará habilitado.

La asignación se hace en el SQL Editor con una cuenta propietaria del proyecto. Los perfiles no conceden permiso de actualización de la columna `role` a los clientes autenticados. No conviertas una cuenta mediante la consola del navegador ni expongas una clave de servicio.

## Ejecutar localmente

```powershell
npm install
Copy-Item .env.example .env.local
# Edita .env.local con los valores públicos de tu proyecto Supabase.
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Sin `.env.local`, la portada muestra fichas demostrativas centradas en los dos formatos; el registro y los paneles no guardan ni simulan cambios.

## Probar el flujo

1. Registra una cuenta de estudiante e inicia sesión en `/alumno`.
2. Elige uno de los formatos. Completa sus apartados, agrega una imagen JPG/PNG/WebP menor de 5 MB y al menos una fuente (puedes separar varias con comas). Verifica que aparece como **En revisión** y no en la colección pública.
3. Inicia sesión con la cuenta administradora y abre `/profesor`. Comprueba la vista previa; prueba solicitar correcciones (requiere nota), editar y aprobar.
4. Vuelve a la sesión del estudiante. La nota y el estado deben aparecer; al editar una ficha con cambios solicitados, debe volver a revisión.
5. Tras aprobarla, comprueba que aparece en la portada y en su detalle. Prueba también el rechazo y la eliminación desde el panel docente.
6. Confirma que una sesión anónima no puede leer fichas pendientes y que un estudiante no puede leer ni editar fichas de otra persona. Las políticas SQL, no la interfaz, imponen estas restricciones.

Para cargar un ejemplo demostrativo en tu base de datos (opcional), crea primero una cuenta administradora y ejecuta [`supabase/seed_demo.sql`](./supabase/seed_demo.sql). La ficha lleva `DEMO` en el título y sus apartados indican que se deben completar; su ilustración se sirve desde la aplicación y no se sube a Storage. Sustituye el ejemplo por investigación local antes de usarlo en clase.

## Despliegue en Vercel

1. Sube el repositorio a GitHub e impórtalo desde [Vercel](https://vercel.com/new).
2. En **Project Settings → Environment Variables**, define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Production (y Preview si corresponde).
3. Añade el dominio asignado por Vercel a Supabase **Authentication → URL Configuration** y a sus Redirect URLs.
4. Despliega. El comando de compilación es `npm run build`; Vercel detecta Next.js automáticamente.
5. Crea y promueve la cuenta docente en SQL como se explicó arriba; no uses una variable con clave de servicio en el cliente.

## Comprobaciones locales

```powershell
npm run lint
npm run build
```
