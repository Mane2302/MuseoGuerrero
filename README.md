# Ecos de Guerrero: De la Patria a la Eternidad

Museo digital educativo para explorar y documentar las tradiciones de Guerrero. El proyecto usa Next.js, TypeScript, Tailwind CSS y Supabase. Las imágenes de las fichas se guardan en un bucket privado y solo se muestran mediante URL firmadas conforme a las políticas RLS.

## Funcionalidades

- Catálogo público de fichas **aprobadas**, con búsqueda y filtros por municipio, región y categoría.
- Carrusel de portada que recorre automáticamente las tradiciones aprobadas.
- Detalle público con historia, significado cultural y fuentes consultadas.
- Registro e inicio de sesión con Supabase Auth; las cuentas nuevas reciben el rol `student`.
- Panel del estudiante para enviar fichas pendientes, consultar su estado, abrir la vista privada de sus envíos en otra pestaña y reenviar correcciones.
- Autoría indicada en cada ficha, con nombre de persona, colectivo o comunidad mostrado junto al municipio y la región.
- Actividad interdisciplinaria que compara la memoria de la Independencia en Guerrero con la tradición del Día de Muertos, con un apartado obligatorio para documentar el vínculo con fuentes.
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

Si ya habías aplicado una versión anterior del esquema, abre **Supabase → SQL Editor** y ejecuta las migraciones [`supabase/migrations/20261018_add_tradition_author.sql`](./supabase/migrations/20261018_add_tradition_author.sql) y [`supabase/migrations/20261018_add_activity_historical_connection.sql`](./supabase/migrations/20261018_add_activity_historical_connection.sql), en ese orden. La segunda agrega el apartado obligatorio **Vínculo entre la Independencia y el Día de Muertos**, habilita la categoría **Memoria histórica** y conserva las fichas existentes, indicando que deben completar el nuevo apartado. Espera unos segundos antes de volver a guardar fichas.

Si aparece un error `Could not find the '...' column of 'traditions' in the schema cache` (para `tradition_author` o `historical_connection`), ejecuta las migraciones que falten en el mismo proyecto indicado por `NEXT_PUBLIC_SUPABASE_URL` y espera unos segundos; actualizar el código de la aplicación no cambia la base de datos.

### Actividad: memoria histórica y Día de Muertos

El propósito es vincular la memoria histórica de la Independencia de México en Guerrero con la tradición del Día de Muertos, para reconocer, valorar y difundir el patrimonio cultural, cívico e histórico que define la identidad nacional actual. Cada ficha debe describir el tema investigado, explicar su historia y significado cultural, y argumentar en **Vínculo entre la Independencia y el Día de Muertos** qué relación encontró el estudiante. Las afirmaciones deben apoyarse en fuentes; no se debe presentar una coincidencia o interpretación como un hecho histórico, y es válido concluir que no se encontró un vínculo directo.

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

Abre [http://localhost:3000](http://localhost:3000). Sin `.env.local`, la portada muestra el catálogo demostrativo; el registro y los paneles no guardan ni simulan cambios.

## Probar el flujo

1. Registra una cuenta de estudiante e inicia sesión en `/alumno`.
2. Crea una ficha con todos los campos, una imagen JPG/PNG/WebP menor de 5 MB y al menos una fuente. Verifica que aparece como **En revisión** y no en la colección pública.
3. Inicia sesión con la cuenta administradora y abre `/profesor`. Comprueba la vista previa; prueba solicitar correcciones (requiere nota), editar y aprobar.
4. Vuelve a la sesión del estudiante. La nota y el estado deben aparecer; al editar una ficha con cambios solicitados, debe volver a revisión.
5. Tras aprobarla, comprueba que aparece en la portada y en su detalle. Prueba también el rechazo y la eliminación desde el panel docente.
6. Confirma que una sesión anónima no puede leer fichas pendientes y que un estudiante no puede leer ni editar fichas de otra persona. Las políticas SQL, no la interfaz, imponen estas restricciones.

Para cargar ejemplos demostrativos en tu base de datos (opcional), crea primero una cuenta administradora y ejecuta [`supabase/seed_demo.sql`](./supabase/seed_demo.sql). Las fichas incluyen `DEMO` en el título y referencias de muestra; sus ilustraciones SVG se sirven desde la aplicación y no se suben a Storage. Verifica la información y reemplaza las fuentes antes de usarla en clase.

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
