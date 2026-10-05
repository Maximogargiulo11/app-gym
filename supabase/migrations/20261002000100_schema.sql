-- Banca · esquema base
-- Todas las tablas viven en `public` y tienen RLS (ver 20261002000300_rls.sql).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() no es IMMUTABLE; este wrapper permite usarlo en columnas generadas e índices.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- Fecha "del gimnasio": todo el piloto está en Córdoba, Argentina.
create or replace function public.gym_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Argentina/Cordoba')::date $$;

-- ───────────────────────── Gimnasios y sedes ─────────────────────────

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  -- slug global: va en la URL del QR (/checkin?b=<slug>&t=<token>)
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  created_at timestamptz not null default now()
);
create index branches_gym_id_idx on public.branches (gym_id);

-- Secreto del QR separado de `branches` para que ningún cliente pueda leerlo:
-- la tabla tiene RLS activado y ninguna política.
create table public.branch_secrets (
  branch_id uuid primary key references public.branches (id) on delete cascade,
  qr_secret text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  -- subir la versión invalida los QR impresos anteriores
  qr_version integer not null default 1 check (qr_version > 0)
);

create table public.gym_staff (
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  primary key (gym_id, user_id)
);

-- ───────────────────────── Perfiles ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- null hasta completar el onboarding
  username text unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  full_name text check (char_length(full_name) between 1 and 60),
  avatar_url text,
  branch_id uuid references public.branches (id) on delete set null,
  -- privada por defecto hasta que la persona elija en el onboarding
  is_private boolean not null default true,
  show_branch boolean not null default true,
  show_schedule boolean not null default true,
  usual_schedule text check (usual_schedule in ('mañana', 'tarde', 'noche')),
  show_in_rankings boolean not null default true,
  approve_tags boolean not null default true,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_branch_id_idx on public.profiles (branch_id);

-- ───────────────────────── Grafo social y seguridad ─────────────────────────

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id, status);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'workout', 'comment', 'partner_post')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'acoso', 'contenido_inapropiado', 'suplantacion', 'otro')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Ejercicios y rutinas ─────────────────────────

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  muscle_groups text[] not null default '{}',
  equipment text,
  -- null = ejercicio global de la biblioteca
  created_by uuid references public.profiles (id) on delete cascade,
  search_name text generated always as (lower(public.f_unaccent(name))) stored,
  created_at timestamptz not null default now()
);
create unique index exercises_global_name_idx on public.exercises (lower(name)) where created_by is null;
create index exercises_search_idx on public.exercises (search_name);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  notes text check (char_length(notes) <= 500),
  -- de dónde se copió (para "copiaste la rutina de …")
  copied_from_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routines_user_idx on public.routines (user_id);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null check (position >= 0),
  target_sets integer not null default 3 check (target_sets between 1 and 20),
  target_reps integer check (target_reps between 1 and 100),
  rest_seconds integer not null default 120 check (rest_seconds between 0 and 900)
);
create index routine_exercises_routine_idx on public.routine_exercises (routine_id, position);

-- ───────────────────────── Entrenamientos ─────────────────────────

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  routine_id uuid references public.routines (id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  status text not null default 'in_progress' check (status in ('in_progress', 'finished')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_volume numeric(10, 2) not null default 0,
  total_sets integer not null default 0,
  notes text check (char_length(notes) <= 1000),
  photo_path text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at),
  check (not is_published or status = 'finished')
);
create index workouts_user_idx on public.workouts (user_id, started_at desc);
create index workouts_feed_idx on public.workouts (started_at desc) where is_published;
create index workouts_branch_feed_idx on public.workouts (branch_id, started_at desc) where is_published;

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null check (position >= 0),
  rest_seconds integer not null default 120 check (rest_seconds between 0 and 900),
  notes text check (char_length(notes) <= 500)
);
create index workout_exercises_workout_idx on public.workout_exercises (workout_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number integer not null check (set_number between 1 and 50),
  weight_kg numeric(6, 2) check (weight_kg between 0 and 1000),
  reps integer check (reps between 0 and 200),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  is_done boolean not null default false,
  is_pr boolean not null default false,
  completed_at timestamptz,
  unique (workout_exercise_id, set_number)
);

create table public.personal_records (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  -- mayor peso levantado (con cuántas reps)
  best_weight numeric(6, 2) not null,
  best_weight_reps integer not null,
  -- mejor 1RM estimado (Epley): peso × (1 + reps / 30)
  best_e1rm numeric(7, 2) not null,
  workout_id uuid references public.workouts (id) on delete set null,
  achieved_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- ───────────────────────── Interacción ─────────────────────────

create table public.likes (
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workout_id, user_id)
);
create index likes_user_idx on public.likes (user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_workout_idx on public.comments (workout_id, created_at);

create table public.workout_tags (
  workout_id uuid not null references public.workouts (id) on delete cascade,
  tagged_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (workout_id, tagged_user_id)
);
create index workout_tags_user_idx on public.workout_tags (tagged_user_id, status);

create table public.partner_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  topic text not null check (char_length(topic) between 2 and 60),
  days text[] not null default '{}',
  time_label text check (char_length(time_label) <= 40),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);
create index partner_posts_branch_idx on public.partner_posts (branch_id, created_at desc) where is_open;

create table public.partner_requests (
  post_id uuid not null references public.partner_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  message text check (char_length(message) <= 300),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ───────────────────────── Sede: check-in y desafíos ─────────────────────────

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  local_date date not null default public.gym_today(),
  created_at timestamptz not null default now(),
  unique (user_id, branch_id, local_date)
);
create index check_ins_branch_date_idx on public.check_ins (branch_id, local_date);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  title text not null,
  description text,
  -- MVP: días entrenados = check-ins
  metric text not null default 'checkin_days' check (metric in ('checkin_days')),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.challenge_branches (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  primary key (challenge_id, branch_id)
);
