@AGENTS.md

# Banca: decisiones del proyecto

Red social de entrenamiento por gimnasio y sede (piloto: Manantial Chacabuco, Córdoba). Toda la interfaz va en **español rioplatense** (vos, querés, entrená). Sin emojis: íconos de línea `lucide-react`.

## Producto: reglas no negociables

- **Nunca** mostrar ubicación en tiempo real ni "está en el gimnasio ahora". El check-in solo suma a la racha y a los desafíos. Los check-ins solo los ve su dueño; a los demás se exponen agregados (`branch_checkins_today`).
- La privacidad se aplica **en la base con RLS**, no solo en el frontend. Toda feature nueva lleva política RLS y prueba en `supabase/tests/`.
- El bloqueo oculta todo en ambos sentidos (`is_blocked_between`) y el trigger `blocks_after_insert` corta follows, etiquetas y solicitudes.
- Las cuentas son privadas por defecto en la base hasta que la persona elige en el onboarding (sin opción preseleccionada).

## Base de datos

- Migraciones en `supabase/migrations/` con timestamp. No se editan las ya aplicadas: se agrega una nueva.
- Regla central: `can_view_content(owner)` = es tuyo, **o** (público **o** follow `accepted`) **y** sin bloqueo. Los entrenamientos usan además `can_view_workout(id)`, que exige `is_published`.
- `profiles` solo deja leer **la fila propia**. Los perfiles ajenos se leen por la vista `profiles_public`, que enmascara `branch_id` y `usual_schedule` según `show_branch` / `show_schedule` y excluye bloqueos. RLS no filtra columnas: por eso la vista.
- Los campos calculados por el servidor no se pueden escribir desde el cliente (permisos por columna): `workouts.status/ended_at/total_*`, `workout_sets.is_pr`, `check_ins` completo, `personal_records`. Se escriben con funciones `security definer`.
- El secreto del QR vive en `branch_secrets` (RLS sin políticas). El token del QR es un HMAC de `slug:qr_version` y se valida en Postgres (fase 4).
- `anon` no tiene acceso a ninguna tabla.
- Las funciones `security definer` llevan `set search_path = ''` y nombres calificados con el esquema.
- Los datos de catálogo que también van a producción (gimnasio, sedes, ejercicios globales) van en **migraciones**. `seed.sql` es solo para desarrollo: usuarios y entrenamientos de prueba, y secretos de QR fijos.
- Después de cambiar el esquema: `npm run db:types`.

## Frontend

- Next.js 16: `middleware.ts` ahora es **`proxy.ts`**. `params` y `searchParams` son Promises. Hay tipos globales `PageProps<"/ruta">` y `LayoutProps` (`next typegen`). Ante la duda, leer `node_modules/next/dist/docs/`.
- Supabase con `@supabase/ssr`: `lib/supabase/server.ts` expone `createClient`, `getUser` y `getMyProfile`, cacheados por request. `lib/supabase/admin.ts` usa la secret key y es **solo servidor**: hoy se usa únicamente para borrar la cuenta.
- El layout `(app)` exige sesión y onboarding completo.
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SECRET_KEY` (o `SUPABASE_SERVICE_ROLE_KEY`) y `NEXT_PUBLIC_SITE_URL`. Se leen al crear el cliente, no al importar el módulo, para que el build no dependa de ellas.
- Tokens de diseño en `app/globals.css` (`@theme` de Tailwind 4):
  - Colores: `bg-bg`, `bg-surface`, `bg-surface-2`, `text-muted`, `text-soft`, `bg-accent` / `text-on-accent`, `bg-accent-bg` + `border-accent-border`, `bg-pr-bg` / `text-pr`.
  - Radios: `rounded-card` (18 px), `rounded-btn` (12 px), `rounded-pill` (22 px).
  - Área táctil: `min-h-tap` / `size-tap` (44 px).
- Fuentes: `font-display` (Google Sans Bold) para títulos y números grandes; `font-sans` (DM Sans) para el resto. Son archivos locales en `app/fonts/`, nada de Google Fonts por link.
- Mobile-first con 390 px de referencia: contenedor `max-w-md px-5`.
- Componentes reutilizables en `components/ui/`. Usar `<button>` y `<a>` reales, `aria-label` en botones de ícono y labels en inputs.
- Cada pantalla tiene estados de carga, vacío y error (`loading.tsx`, `error.tsx`, `EmptyState`, `ErrorState`).
- Formularios con `action={...}`: usar inputs **controlados**, porque React resetea el formulario después de enviar.

## Entrenamientos (fase 2)

- El entrenamiento en curso vive en `lib/workout/use-active-workout.ts`: se guarda al instante en `localStorage` y se sincroniza con la RPC `sync_workout`, que reemplaza ejercicios y series y es atómica. La copia del dispositivo gana al recargar.
- `finish_workout` descarta las series sin marcar, calcula totales y detecta los récords (mejor peso o 1RM de Epley) en el servidor. La primera vez que se hace un ejercicio no cuenta como récord.
- `previous_sets` alimenta la columna "Anterior". `save_routine` crea o reemplaza rutinas.
- Hay un solo entrenamiento en curso por persona (índice único parcial).

## Flujo de trabajo y deploy (acordado con el dueño)

Claude construye en GitHub y el deploy es automático. El dueño **no** tiene que copiar SQL ni tocar Vercel ni Supabase a mano.

1. Trabajar en la rama de la sesión, creada desde `main` actualizado.
2. Antes de subir, validar en local: `npm run lint`, `npm run typecheck`, `npm run build`, y si se tocó la base, `npm run db:reset` y `npm run test:rls`.
3. Push, abrir un PR a `main` y **mergearlo** (el dueño lo autorizó). El commit de merge queda a nombre del dueño, que es lo que necesita Vercel Hobby.
4. Al mergear a `main`:
   - **Vercel** despliega a producción: https://app-gym-three-ebon.vercel.app
   - La **integración Supabase ↔ GitHub** (check "Supabase Preview") aplica las migraciones nuevas en el proyecto `ahkjpvbnejaqolrdgcce`.
5. Verificar que el status "Vercel" y el check "Supabase Preview" terminen en success sobre el commit de `main`. Después avisarle al dueño qué probar.

Reglas:
- Todo cambio de base va como **migración nueva** en `supabase/migrations/`. Nunca SQL a mano en el dashboard.
- Nunca pedirle al dueño que pegue SQL, salvo que la integración falle.
- Los commits de Claude en ramas no se despliegan solos (Vercel Hobby los rechaza). Lo que se publica es lo que llega a `main`.
- `supabase/setup-produccion.sql` es solo un respaldo para crear la base a mano en un proyecto vacío; las migraciones son la fuente de verdad.

## Comandos

```
npm run dev | build | lint | typecheck
npm run db:start | db:reset | db:types | test:rls
```

## Fuera del MVP

No construir todavía: mensajes directos, notificaciones push, panel completo para el gimnasio, pagos ni apps nativas.
