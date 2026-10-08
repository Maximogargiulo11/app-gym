# Banca

Red social de entrenamiento por gimnasio y sede: registro de entrenamientos estilo Hevy y comunidad estilo Instagram. El piloto es en Manantial, sede Chacabuco (Córdoba).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres con RLS, Storage) · PWA · Vercel.

## Estado

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 · Base | Tokens de diseño, fuentes, Supabase, migraciones, RLS, seed, auth (email + Google), onboarding y barra inferior | ✅ |
| 2 · Entrenar | Biblioteca, entrenamiento en curso, descanso, PR, rutinas | ✅ |
| 3 · Social | Feed, likes, comentarios, perfiles, follows, bloqueo, reportes, "busco compañero" | ✅ |
| 4 · Sede | Check-in QR, racha, rankings, desafíos y admin de QR | — |
| 5 · PWA y deploy | Service worker, íconos, offline, legales, eliminar cuenta | — |

## Correr en local

Requisitos: Node 20+ y Docker (para Supabase local).

```bash
npm install
cp .env.example .env.local

# Levanta Postgres, Auth, Storage y la API en Docker. Aplica migraciones y seed.
npm run db:start
```

`supabase start` imprime `API_URL`, `PUBLISHABLE_KEY` y `SECRET_KEY`. Copialos a `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
SUPABASE_SECRET_KEY=<SECRET_KEY>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Después:

```bash
npm run dev     # http://localhost:3000
```

### Usuarios de prueba

Todos usan la contraseña `banca1234`.

| Email | Quién | Para probar |
| --- | --- | --- |
| `demo@banca.app` | Maxi G., pública, Chacabuco, admin | Usuario principal |
| `lucia@banca.app` | Lucía M., pública | demo la sigue |
| `mateo@banca.app` | Mateo F., **privada** | demo la sigue (aceptada) |
| `camila@banca.app` | Camila A., **privada** | demo le mandó solicitud (pendiente) |
| `sofia@banca.app` | Sofía C., **privada**, Sede Centro | Fuera de rankings |
| `bruno@banca.app` | Bruno K. | **Bloqueó a demo** |

Hay más usuarios en `supabase/seed.sql`, con unos 200 entrenamientos de las últimas 5 semanas.

## Base de datos

- Migraciones versionadas en `supabase/migrations/`:
  - `…0100_schema.sql`: tablas.
  - `…0200_functions.sql`: reglas de privacidad, triggers y vista `profiles_public`.
  - `…0300_rls.sql`: políticas y permisos por columna.
  - `…20261005000100_catalog.sql`: gimnasio Manantial, sus 3 sedes y los 65 ejercicios. Es catálogo real, así que también se aplica en producción.
- Seed de desarrollo: `supabase/seed.sql`.

```bash
npm run db:reset   # reaplica todas las migraciones + seed
npm run db:types   # regenera lib/supabase/database.types.ts
npm run test:rls   # pruebas de privacidad (pgTAP)
```

Para crear una migración nueva: `npx supabase migration new <nombre>`.

### Pruebas de RLS

`supabase/tests/rls.test.sql` entra como distintos usuarios (sin sesión, pública, privada, bloqueada) y verifica qué puede leer y escribir cada uno: 40 aserciones. Para correrlas, con Supabase local levantado:

```bash
npm run test:rls
```

## Google OAuth

1. En Google Cloud Console, creá un "OAuth client ID" de tipo Web.
   - Authorized redirect URI en local: `http://127.0.0.1:54321/auth/v1/callback`.
   - En producción: `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
2. **Local:** exportá `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` y `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, poné `enabled = true` en `[auth.external.google]` de `supabase/config.toml` y reiniciá con `npm run db:stop && npm run db:start`.
3. **Producción:** Supabase Dashboard → Authentication → Providers → Google.

## Deploy (Supabase cloud + Vercel)

1. Creá un proyecto en [supabase.com](https://supabase.com) (región São Paulo, la más cercana a Córdoba).
2. Aplicá las migraciones:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   Si conectaste el repo desde Supabase (Project Settings → Integrations → GitHub) con "Deploy to production" activado, las migraciones se aplican solas cada vez que se mergea a `main`.

   **No corras `seed.sql` en producción**: tiene usuarios y secretos de QR de prueba. El gimnasio, las sedes y los ejercicios ya vienen en las migraciones, y cada sede genera su `qr_secret` al azar.
3. En Authentication → URL Configuration:
   - Site URL: `https://<tu-app>.vercel.app`.
   - Redirect URLs: `https://<tu-app>.vercel.app/auth/callback`.
4. En Vercel, importá el repo y cargá las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - `SUPABASE_SECRET_KEY` (o `SUPABASE_SERVICE_ROLE_KEY`): solo servidor, nunca con prefijo `NEXT_PUBLIC_`.

   La integración Supabase ↔ Vercel carga estas variables sola. La app acepta los dos nombres de cada clave.
   - `NEXT_PUBLIC_SITE_URL`.
5. Vercel en plan Hobby solo despliega commits del dueño de la cuenta. Los commits de Claude se publican al mergear el Pull Request a `main` desde GitHub.

## Estructura

```
app/
  (auth)/          login, registro y server actions de auth
  (app)/           pantallas con sesión y barra inferior: feed, entrenar, sede, perfil
  auth/            callback de OAuth y confirmación de email, signout (POST)
  onboarding/      3 pasos: nombre y usuario → gimnasio y sede → privacidad
  fonts/           Google Sans Bold y DM Sans (woff2) + licencias OFL
components/ui/     Button, Card, Pill, Toggle, Avatar, RadioCard, TextField, BottomNav, estados
lib/supabase/      clientes de navegador, servidor, proxy y admin; tipos generados
proxy.ts           refresca la sesión y redirige a /login (en Next 16, middleware → proxy)
supabase/          config, migraciones, seed y pruebas pgTAP
```

## Fuentes

Google Sans Bold y DM Sans variable salen del repo oficial [google/fonts](https://github.com/google/fonts). Las dos son licencia OFL (ver `app/fonts/OFL-*.txt`). Están recortadas a latín y en `.woff2` (27 KB y 69 KB) y se cargan con `next/font/local`.
