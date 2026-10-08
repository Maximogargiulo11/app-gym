-- Banca: crea todas las tablas en un proyecto de Supabase vacío. Pegar entero en SQL Editor y tocar Run.
-- Generado uniendo supabase/migrations/*.sql (no editar a mano; las migraciones son la fuente de verdad).

-- ===== supabase/migrations/20261002000100_schema.sql =====
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

-- ===== supabase/migrations/20261002000200_functions.sql =====
-- Banca · funciones de privacidad, triggers y vista pública de perfiles
-- Las funciones `security definer` fijan search_path = '' y califican todo con el esquema.

-- ───────────────────────── Utilidades ─────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger routines_updated_at before update on public.routines
  for each row execute function public.set_updated_at();

-- Crea el perfil vacío al registrarse (email o Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60), ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Reglas de visibilidad ─────────────────────────

-- ¿Hay un bloqueo en cualquiera de los dos sentidos?
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  )
$$;

-- ¿`viewer` sigue a `owner` con la solicitud aceptada?
create or replace function public.is_accepted_follower(viewer uuid, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.follows
    where follower_id = viewer and following_id = owner and status = 'accepted'
  )
$$;

-- Regla central: ¿el usuario actual puede ver el contenido (entrenamientos, PRs, rutinas,
-- fotos) de `owner`? Es suyo, o (es público o lo sigue aceptado) y no hay bloqueo.
create or replace function public.can_view_content(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    owner = auth.uid()
    or (
      not public.is_blocked_between(auth.uid(), owner)
      and exists (
        select 1 from public.profiles p
        where p.id = owner
          and (not p.is_private or public.is_accepted_follower(auth.uid(), owner))
      )
    )
  )
$$;

-- Un entrenamiento se ve si es tuyo, o si está publicado y podés ver el contenido del autor.
create or replace function public.can_view_workout(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workouts w
    where w.id = wid
      and (
        w.user_id = auth.uid()
        or (w.is_published and public.can_view_content(w.user_id))
      )
  )
$$;

create or replace function public.owns_workout(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.workouts where id = wid and user_id = auth.uid())
$$;

create or replace function public.owns_routine(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.routines where id = rid and user_id = auth.uid())
$$;

create or replace function public.workout_of_exercise(weid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workout_id from public.workout_exercises where id = weid
$$;

create or replace function public.gym_of_branch(bid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select gym_id from public.branches where id = bid
$$;

-- Gimnasio del usuario actual (según su sede).
create or replace function public.my_gym_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.gym_id from public.profiles p join public.branches b on b.id = p.branch_id
  where p.id = auth.uid()
$$;

create or replace function public.is_gym_staff(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.gym_staff where gym_id = gid and user_id = auth.uid())
$$;

-- ───────────────────────── Follows ─────────────────────────

-- Al seguir: pública → aceptada directo; privada → pendiente. Nunca si hay bloqueo.
create or replace function public.follows_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_blocked_between(new.follower_id, new.following_id) then
    raise exception 'No podés seguir a esta cuenta' using errcode = '42501';
  end if;

  select case when p.is_private then 'pending' else 'accepted' end
    into new.status
  from public.profiles p
  where p.id = new.following_id;

  return new;
end;
$$;

create trigger follows_before_insert before insert on public.follows
  for each row execute function public.follows_before_insert();

-- Solo se puede pasar de pendiente a aceptada (la columna es la única actualizable).
create or replace function public.follows_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.follower_id <> old.follower_id or new.following_id <> old.following_id then
    raise exception 'No se puede modificar el seguimiento' using errcode = '42501';
  end if;
  if new.status <> 'accepted' then
    raise exception 'Estado inválido' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger follows_before_update before update on public.follows
  for each row execute function public.follows_before_update();

-- Si una cuenta privada pasa a pública, se aceptan las solicitudes pendientes.
create or replace function public.profiles_after_privacy_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted'
    where following_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger profiles_after_privacy_change after update of is_private on public.profiles
  for each row execute function public.profiles_after_privacy_change();

-- ───────────────────────── Bloqueos ─────────────────────────

-- El bloqueo corta todo vínculo en ambos sentidos.
create or replace function public.blocks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);

  delete from public.workout_tags t
  using public.workouts w
  where w.id = t.workout_id
    and ((w.user_id = new.blocker_id and t.tagged_user_id = new.blocked_id)
      or (w.user_id = new.blocked_id and t.tagged_user_id = new.blocker_id));

  delete from public.partner_requests r
  using public.partner_posts pp
  where pp.id = r.post_id
    and ((pp.user_id = new.blocker_id and r.user_id = new.blocked_id)
      or (pp.user_id = new.blocked_id and r.user_id = new.blocker_id));

  return new;
end;
$$;

create trigger blocks_after_insert after insert on public.blocks
  for each row execute function public.blocks_after_insert();

-- ───────────────────────── Etiquetas ─────────────────────────

-- Solo el autor etiqueta; el estado depende de `approve_tags` de la persona etiquetada.
create or replace function public.workout_tags_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  select user_id into author from public.workouts where id = new.workout_id;
  if author is null or author = new.tagged_user_id then
    raise exception 'Etiqueta inválida' using errcode = '22023';
  end if;
  if public.is_blocked_between(author, new.tagged_user_id) then
    raise exception 'No podés etiquetar a esta cuenta' using errcode = '42501';
  end if;

  select case when p.approve_tags then 'pending' else 'accepted' end
    into new.status
  from public.profiles p
  where p.id = new.tagged_user_id;

  return new;
end;
$$;

create trigger workout_tags_before_insert before insert on public.workout_tags
  for each row execute function public.workout_tags_before_insert();

-- ───────────────────────── Vista pública de perfiles ─────────────────────────
-- RLS filtra filas, no columnas: `profiles` solo deja leer la fila propia y el resto de la
-- app lee esta vista, que oculta sede y horario según las preferencias y excluye bloqueos.
-- Corre con los permisos del dueño (security_invoker = false) a propósito.

create view public.profiles_public
with (security_barrier = true)
as
select
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.is_private,
  case when p.show_branch or p.id = auth.uid() then p.branch_id end as branch_id,
  case
    when p.id = auth.uid() or (p.show_schedule and public.can_view_content(p.id))
      then p.usual_schedule
  end as usual_schedule,
  public.can_view_content(p.id) as can_view_content,
  p.created_at
from public.profiles p
where auth.uid() is not null
  and p.username is not null
  and not public.is_blocked_between(auth.uid(), p.id);

revoke all on public.profiles_public from anon, public;
grant select on public.profiles_public to authenticated;

-- Contadores visibles para cualquier usuario logueado sin bloqueo (incluso de cuentas privadas).
create or replace function public.profile_stats(uid uuid)
returns table (workouts integer, followers integer, following integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::int from public.workouts w where w.user_id = uid and w.is_published),
    (select count(*)::int from public.follows f where f.following_id = uid and f.status = 'accepted'),
    (select count(*)::int from public.follows f where f.follower_id = uid and f.status = 'accepted')
  where auth.uid() is not null and not public.is_blocked_between(auth.uid(), uid)
$$;

create or replace function public.username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and name ~ '^[a-z0-9_.]{3,20}$'
    and not exists (select 1 from public.profiles where username = name and id <> auth.uid())
$$;

-- Agregado sin datos personales: cuántas personas hicieron check-in hoy en una sede.
create or replace function public.branch_checkins_today(bid uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.check_ins
  where branch_id = bid and local_date = public.gym_today() and auth.uid() is not null
$$;

create or replace function public.branch_member_count(bid uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.profiles
  where branch_id = bid and onboarded_at is not null and auth.uid() is not null
$$;

-- ───────────────────────── Permisos de ejecución ─────────────────────────

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.f_unaccent(text),
  public.gym_today(),
  public.is_blocked_between(uuid, uuid),
  public.is_accepted_follower(uuid, uuid),
  public.can_view_content(uuid),
  public.can_view_workout(uuid),
  public.owns_workout(uuid),
  public.owns_routine(uuid),
  public.workout_of_exercise(uuid),
  public.gym_of_branch(uuid),
  public.my_gym_id(),
  public.is_gym_staff(uuid),
  public.profile_stats(uuid),
  public.username_available(text),
  public.branch_checkins_today(uuid),
  public.branch_member_count(uuid)
to authenticated;

-- ===== supabase/migrations/20261002000300_rls.sql =====
-- Banca · Row Level Security
-- Regla general: `anon` no toca nada; todo requiere sesión. La privacidad se resuelve acá,
-- no en el frontend.

revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

alter table public.gyms enable row level security;
alter table public.branches enable row level security;
alter table public.branch_secrets enable row level security;
alter table public.gym_staff enable row level security;
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.personal_records enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.workout_tags enable row level security;
alter table public.partner_posts enable row level security;
alter table public.partner_requests enable row level security;
alter table public.check_ins enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_branches enable row level security;

-- ───────────────────────── Catálogo ─────────────────────────

create policy "gyms: lectura con sesión" on public.gyms
  for select to authenticated using (true);

create policy "branches: lectura con sesión" on public.branches
  for select to authenticated using (true);

-- branch_secrets: sin políticas → ningún cliente lo lee ni lo escribe.
revoke all on public.branch_secrets from authenticated;

create policy "gym_staff: ver mis roles" on public.gym_staff
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.gym_staff from authenticated;

create policy "challenges: ver los de mi gimnasio" on public.challenges
  for select to authenticated using (gym_id = public.my_gym_id());
revoke insert, update, delete on public.challenges from authenticated;

create policy "challenge_branches: ver los de mi gimnasio" on public.challenge_branches
  for select to authenticated using (
    exists (select 1 from public.challenges c where c.id = challenge_id and c.gym_id = public.my_gym_id())
  );
revoke insert, update, delete on public.challenge_branches from authenticated;

-- ───────────────────────── Perfiles ─────────────────────────
-- Solo la fila propia. Los perfiles ajenos se leen por `profiles_public`.

create policy "profiles: ver el propio" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles: editar el propio" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke insert, update, delete on public.profiles from authenticated;
grant update (
  username, full_name, avatar_url, branch_id, is_private, show_branch, show_schedule,
  usual_schedule, show_in_rankings, approve_tags, onboarded_at
) on public.profiles to authenticated;

-- ───────────────────────── Follows / bloqueos / reportes ─────────────────────────

create policy "follows: ver los míos" on public.follows
  for select to authenticated using (follower_id = auth.uid() or following_id = auth.uid());

create policy "follows: seguir" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());

-- Aceptar una solicitud que me mandaron.
create policy "follows: aceptar" on public.follows
  for update to authenticated using (following_id = auth.uid()) with check (following_id = auth.uid());

-- Dejar de seguir, cancelar solicitud, rechazarla o sacar un seguidor.
create policy "follows: borrar" on public.follows
  for delete to authenticated using (follower_id = auth.uid() or following_id = auth.uid());

revoke update on public.follows from authenticated;
grant update (status) on public.follows to authenticated;

create policy "blocks: ver los míos" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "blocks: bloquear" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks: desbloquear" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());
revoke update on public.blocks from authenticated;

create policy "reports: ver los míos" on public.reports
  for select to authenticated using (reporter_id = auth.uid());
create policy "reports: reportar" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
revoke update, delete on public.reports from authenticated;
revoke insert on public.reports from authenticated;
grant insert (target_type, target_id, reason, details) on public.reports to authenticated;

-- ───────────────────────── Ejercicios y rutinas ─────────────────────────

create policy "exercises: globales y propios" on public.exercises
  for select to authenticated using (created_by is null or created_by = auth.uid());
create policy "exercises: crear propios" on public.exercises
  for insert to authenticated with check (created_by = auth.uid());
create policy "exercises: editar propios" on public.exercises
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "exercises: borrar propios" on public.exercises
  for delete to authenticated using (created_by = auth.uid());

-- Las rutinas son copiables: se ven con la misma regla que el resto del contenido.
create policy "routines: ver" on public.routines
  for select to authenticated using (public.can_view_content(user_id));
create policy "routines: crear" on public.routines
  for insert to authenticated with check (user_id = auth.uid());
create policy "routines: editar" on public.routines
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "routines: borrar" on public.routines
  for delete to authenticated using (user_id = auth.uid());

create policy "routine_exercises: ver" on public.routine_exercises
  for select to authenticated using (
    exists (select 1 from public.routines r where r.id = routine_id and public.can_view_content(r.user_id))
  );
create policy "routine_exercises: escribir" on public.routine_exercises
  for all to authenticated
  using (public.owns_routine(routine_id))
  with check (public.owns_routine(routine_id));

-- ───────────────────────── Entrenamientos ─────────────────────────

create policy "workouts: ver" on public.workouts
  for select to authenticated using (
    user_id = auth.uid() or (is_published and public.can_view_content(user_id))
  );
create policy "workouts: crear" on public.workouts
  for insert to authenticated with check (user_id = auth.uid() and status = 'in_progress' and not is_published);
create policy "workouts: editar" on public.workouts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workouts: borrar" on public.workouts
  for delete to authenticated using (user_id = auth.uid());

-- Estado, totales y fecha de fin los fija el servidor al terminar (función finish_workout).
revoke insert, update on public.workouts from authenticated;
grant insert (id, branch_id, routine_id, title, started_at, notes) on public.workouts to authenticated;
grant update (branch_id, title, notes, photo_path, is_published) on public.workouts to authenticated;

create policy "workout_exercises: ver" on public.workout_exercises
  for select to authenticated using (public.can_view_workout(workout_id));
create policy "workout_exercises: escribir" on public.workout_exercises
  for all to authenticated
  using (public.owns_workout(workout_id))
  with check (public.owns_workout(workout_id));

create policy "workout_sets: ver" on public.workout_sets
  for select to authenticated using (public.can_view_workout(public.workout_of_exercise(workout_exercise_id)));
create policy "workout_sets: escribir" on public.workout_sets
  for all to authenticated
  using (public.owns_workout(public.workout_of_exercise(workout_exercise_id)))
  with check (public.owns_workout(public.workout_of_exercise(workout_exercise_id)));

-- is_pr lo calcula el servidor.
revoke insert, update on public.workout_sets from authenticated;
grant insert (id, workout_exercise_id, set_number, weight_kg, reps, rpe, is_done, completed_at)
  on public.workout_sets to authenticated;
grant update (set_number, weight_kg, reps, rpe, is_done, completed_at) on public.workout_sets to authenticated;

create policy "personal_records: ver" on public.personal_records
  for select to authenticated using (public.can_view_content(user_id));
revoke insert, update, delete on public.personal_records from authenticated;

-- ───────────────────────── Likes, comentarios, etiquetas ─────────────────────────

create policy "likes: ver" on public.likes
  for select to authenticated using (
    public.can_view_workout(workout_id) and not public.is_blocked_between(auth.uid(), user_id)
  );
create policy "likes: dar" on public.likes
  for insert to authenticated with check (user_id = auth.uid() and public.can_view_workout(workout_id));
create policy "likes: sacar" on public.likes
  for delete to authenticated using (user_id = auth.uid());
revoke update on public.likes from authenticated;

create policy "comments: ver" on public.comments
  for select to authenticated using (
    public.can_view_workout(workout_id) and not public.is_blocked_between(auth.uid(), user_id)
  );
create policy "comments: comentar" on public.comments
  for insert to authenticated with check (user_id = auth.uid() and public.can_view_workout(workout_id));
-- Borra quien comentó o el autor del entrenamiento.
create policy "comments: borrar" on public.comments
  for delete to authenticated using (user_id = auth.uid() or public.owns_workout(workout_id));
revoke update on public.comments from authenticated;
revoke insert on public.comments from authenticated;
grant insert (workout_id, body) on public.comments to authenticated;

create policy "workout_tags: ver" on public.workout_tags
  for select to authenticated using (
    tagged_user_id = auth.uid()
    or public.owns_workout(workout_id)
    or (status = 'accepted' and public.can_view_workout(workout_id)
        and not public.is_blocked_between(auth.uid(), tagged_user_id))
  );
create policy "workout_tags: etiquetar" on public.workout_tags
  for insert to authenticated with check (public.owns_workout(workout_id));
create policy "workout_tags: aceptar" on public.workout_tags
  for update to authenticated using (tagged_user_id = auth.uid()) with check (tagged_user_id = auth.uid());
create policy "workout_tags: quitar" on public.workout_tags
  for delete to authenticated using (tagged_user_id = auth.uid() or public.owns_workout(workout_id));
revoke update on public.workout_tags from authenticated;
grant update (status) on public.workout_tags to authenticated;

-- ───────────────────────── Busco compañero ─────────────────────────
-- Lo publica la persona a propósito, así que lo ve cualquiera de su gimnasio sin bloqueo,
-- aunque la cuenta sea privada.

create policy "partner_posts: ver los de mi gimnasio" on public.partner_posts
  for select to authenticated using (
    user_id = auth.uid()
    or (public.gym_of_branch(branch_id) = public.my_gym_id()
        and not public.is_blocked_between(auth.uid(), user_id))
  );
create policy "partner_posts: crear" on public.partner_posts
  for insert to authenticated with check (user_id = auth.uid());
create policy "partner_posts: editar" on public.partner_posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "partner_posts: borrar" on public.partner_posts
  for delete to authenticated using (user_id = auth.uid());

create policy "partner_requests: ver" on public.partner_requests
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.partner_posts p where p.id = post_id and p.user_id = auth.uid())
  );
create policy "partner_requests: sumarme" on public.partner_requests
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.partner_posts p
      where p.id = post_id and p.is_open and p.user_id <> auth.uid()
        and public.gym_of_branch(p.branch_id) = public.my_gym_id()
        and not public.is_blocked_between(auth.uid(), p.user_id)
    )
  );
create policy "partner_requests: borrar" on public.partner_requests
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.partner_posts p where p.id = post_id and p.user_id = auth.uid())
  );
revoke update on public.partner_requests from authenticated;

-- ───────────────────────── Check-ins ─────────────────────────
-- Solo los ve su dueño. Se crean únicamente con la función que valida el QR.

create policy "check_ins: ver los míos" on public.check_ins
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.check_ins from authenticated;

-- ===== supabase/migrations/20261005000100_catalog.sql =====
-- Banca · catálogo inicial del piloto (datos reales, también en producción)
-- Gimnasio Manantial con sus sedes y la biblioteca global de ejercicios. Los IDs son fijos
-- para que el seed de desarrollo pueda referenciarlos.

-- ───────────────────────── Gimnasio y sedes ─────────────────────────

insert into public.gyms (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Manantial', 'manantial');

insert into public.branches (id, gym_id, name, slug) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Chacabuco', 'manantial-chacabuco'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Sede Centro', 'manantial-centro'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Sede Norte', 'manantial-norte');

-- Cada sede arranca con un secreto de QR aleatorio.
insert into public.branch_secrets (branch_id)
select id from public.branches;

-- ───────────────────────── Ejercicios (biblioteca global) ─────────────────────────

insert into public.exercises (name, muscle_groups, equipment) values
  -- Pecho
  ('Press banca con barra', '{Pecho,Tríceps,Hombro}', 'Barra'),
  ('Press banca inclinado con barra', '{Pecho,Hombro,Tríceps}', 'Barra'),
  ('Press banca con mancuernas', '{Pecho,Tríceps,Hombro}', 'Mancuernas'),
  ('Press inclinado con mancuernas', '{Pecho,Hombro,Tríceps}', 'Mancuernas'),
  ('Aperturas con mancuernas', '{Pecho}', 'Mancuernas'),
  ('Cruce de poleas', '{Pecho}', 'Polea'),
  ('Fondos en paralelas', '{Pecho,Tríceps}', 'Peso corporal'),
  ('Flexiones de brazos', '{Pecho,Tríceps}', 'Peso corporal'),
  ('Press de pecho en máquina', '{Pecho,Tríceps}', 'Máquina'),
  ('Pec deck', '{Pecho}', 'Máquina'),
  -- Espalda
  ('Dominadas', '{Espalda,Bíceps}', 'Peso corporal'),
  ('Dominadas supinas', '{Espalda,Bíceps}', 'Peso corporal'),
  ('Jalón al pecho', '{Espalda,Bíceps}', 'Polea'),
  ('Remo con barra', '{Espalda,Bíceps}', 'Barra'),
  ('Remo con mancuerna', '{Espalda,Bíceps}', 'Mancuernas'),
  ('Remo en polea baja', '{Espalda,Bíceps}', 'Polea'),
  ('Remo en máquina', '{Espalda,Bíceps}', 'Máquina'),
  ('Remo en T', '{Espalda,Bíceps}', 'Barra'),
  ('Pullover en polea', '{Espalda}', 'Polea'),
  ('Peso muerto', '{Espalda,Isquiotibiales,Glúteos}', 'Barra'),
  -- Hombro
  ('Press militar con barra', '{Hombro,Tríceps}', 'Barra'),
  ('Press militar con mancuernas', '{Hombro,Tríceps}', 'Mancuernas'),
  ('Press Arnold', '{Hombro,Tríceps}', 'Mancuernas'),
  ('Elevaciones laterales', '{Hombro}', 'Mancuernas'),
  ('Elevaciones laterales en polea', '{Hombro}', 'Polea'),
  ('Elevaciones frontales', '{Hombro}', 'Mancuernas'),
  ('Pájaros', '{Hombro,Espalda}', 'Mancuernas'),
  ('Face pull', '{Hombro,Espalda}', 'Polea'),
  ('Encogimientos con barra', '{Trapecio}', 'Barra'),
  -- Brazos
  ('Curl con barra', '{Bíceps}', 'Barra'),
  ('Curl con mancuernas', '{Bíceps}', 'Mancuernas'),
  ('Curl martillo', '{Bíceps,Antebrazo}', 'Mancuernas'),
  ('Curl en banco Scott', '{Bíceps}', 'Barra'),
  ('Curl en polea', '{Bíceps}', 'Polea'),
  ('Extensión de tríceps en polea', '{Tríceps}', 'Polea'),
  ('Press francés', '{Tríceps}', 'Barra'),
  ('Extensión de tríceps sobre la cabeza', '{Tríceps}', 'Mancuernas'),
  ('Press banca agarre cerrado', '{Tríceps,Pecho}', 'Barra'),
  ('Patada de tríceps', '{Tríceps}', 'Mancuernas'),
  -- Piernas
  ('Sentadilla con barra', '{Cuádriceps,Glúteos,Isquiotibiales}', 'Barra'),
  ('Sentadilla frontal', '{Cuádriceps,Glúteos}', 'Barra'),
  ('Sentadilla hack', '{Cuádriceps,Glúteos}', 'Máquina'),
  ('Sentadilla goblet', '{Cuádriceps,Glúteos}', 'Mancuernas'),
  ('Sentadilla búlgara', '{Cuádriceps,Glúteos}', 'Mancuernas'),
  ('Prensa 45°', '{Cuádriceps,Glúteos}', 'Máquina'),
  ('Estocadas con mancuernas', '{Cuádriceps,Glúteos}', 'Mancuernas'),
  ('Step-up', '{Cuádriceps,Glúteos}', 'Mancuernas'),
  ('Peso muerto rumano', '{Isquiotibiales,Glúteos,Espalda}', 'Barra'),
  ('Sillón de cuádriceps', '{Cuádriceps}', 'Máquina'),
  ('Camilla de isquiotibiales', '{Isquiotibiales}', 'Máquina'),
  ('Curl femoral sentado', '{Isquiotibiales}', 'Máquina'),
  ('Hip thrust', '{Glúteos,Isquiotibiales}', 'Barra'),
  ('Aductores en máquina', '{Aductores}', 'Máquina'),
  ('Abductores en máquina', '{Glúteos}', 'Máquina'),
  ('Gemelos de pie', '{Gemelos}', 'Máquina'),
  ('Gemelos sentado', '{Gemelos}', 'Máquina'),
  -- Core
  ('Plancha', '{Core}', 'Peso corporal'),
  ('Crunch abdominal', '{Core}', 'Peso corporal'),
  ('Crunch en polea', '{Core}', 'Polea'),
  ('Elevación de piernas colgado', '{Core}', 'Peso corporal'),
  ('Rueda abdominal', '{Core}', 'Otro'),
  ('Russian twist', '{Core}', 'Peso corporal'),
  -- Cardio
  ('Cinta', '{Cardio}', 'Máquina'),
  ('Bicicleta fija', '{Cardio}', 'Máquina'),
  ('Remo ergómetro', '{Cardio,Espalda}', 'Máquina');

-- ===== supabase/migrations/20261006000100_backfill_profiles.sql =====
-- Banca · perfiles para usuarios creados antes de que existiera el trigger handle_new_user
-- (por ejemplo, si alguien se registró antes de aplicar las migraciones en el proyecto).
insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  nullif(left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), 60), ''),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ===== supabase/migrations/20261007000100_training.sql =====
-- Banca · Fase 2: entrenamiento en curso, "anterior", terminar y récords personales

-- Un solo entrenamiento en curso por persona.
create unique index workouts_one_in_progress_idx on public.workouts (user_id) where status = 'in_progress';

-- ───────────────────────── Guardar el entrenamiento en curso ─────────────────────────
-- El cliente guarda todo el estado (ejercicios y series) en una sola llamada atómica.
-- Reemplaza los ejercicios y series del entrenamiento; los IDs vienen del cliente.
-- Formato de p_exercises:
--   [{ "id", "exercise_id", "position", "rest_seconds",
--      "sets": [{ "id", "set_number", "weight_kg", "reps", "is_done", "completed_at" }] }]
create or replace function public.sync_workout(p_workout_id uuid, p_title text, p_exercises jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ex jsonb;
  st jsonb;
begin
  perform 1 from public.workouts
  where id = p_workout_id and user_id = auth.uid() and status = 'in_progress'
  for update;
  if not found then
    raise exception 'Entrenamiento no encontrado o ya terminado' using errcode = '42501';
  end if;

  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) > 40 then
    raise exception 'Datos inválidos' using errcode = '22023';
  end if;

  update public.workouts
  set title = coalesce(nullif(left(btrim(p_title), 80), ''), title)
  where id = p_workout_id;

  delete from public.workout_exercises where workout_id = p_workout_id;

  for ex in select * from jsonb_array_elements(p_exercises) loop
    -- Solo ejercicios globales o creados por la persona.
    if not exists (
      select 1 from public.exercises e
      where e.id = (ex ->> 'exercise_id')::uuid and (e.created_by is null or e.created_by = auth.uid())
    ) then
      raise exception 'Ejercicio inválido' using errcode = '22023';
    end if;

    insert into public.workout_exercises (id, workout_id, exercise_id, position, rest_seconds)
    values (
      (ex ->> 'id')::uuid,
      p_workout_id,
      (ex ->> 'exercise_id')::uuid,
      (ex ->> 'position')::int,
      coalesce((ex ->> 'rest_seconds')::int, 120)
    );

    for st in select * from jsonb_array_elements(coalesce(ex -> 'sets', '[]'::jsonb)) loop
      insert into public.workout_sets (id, workout_exercise_id, set_number, weight_kg, reps, is_done, completed_at)
      values (
        (st ->> 'id')::uuid,
        (ex ->> 'id')::uuid,
        (st ->> 'set_number')::int,
        (st ->> 'weight_kg')::numeric,
        (st ->> 'reps')::int,
        coalesce((st ->> 'is_done')::boolean, false),
        (st ->> 'completed_at')::timestamptz
      );
    end loop;
  end loop;
end;
$$;

-- ───────────────────────── "Anterior" ─────────────────────────
-- Las series de la última vez que la persona hizo cada ejercicio (entrenamientos terminados).
create or replace function public.previous_sets(p_exercise_ids uuid[])
returns table (exercise_id uuid, set_number integer, weight_kg numeric, reps integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with last_we as (
    select distinct on (we.exercise_id) we.id, we.exercise_id
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.user_id = auth.uid()
      and w.status = 'finished'
      and we.exercise_id = any (p_exercise_ids)
    order by we.exercise_id, w.started_at desc
  )
  select l.exercise_id, s.set_number, s.weight_kg, s.reps
  from last_we l
  join public.workout_sets s on s.workout_exercise_id = l.id
  where s.is_done
  order by l.exercise_id, s.set_number
$$;

-- ───────────────────────── Terminar ─────────────────────────
-- Descarta series sin completar, calcula totales, detecta récords y cierra el entrenamiento.
-- Récord = supera el mejor peso o el mejor 1RM estimado (Epley) de la persona en ese ejercicio.
-- La primera vez que se hace un ejercicio se guarda la marca, pero no se muestra como récord.
create or replace function public.finish_workout(p_workout_id uuid, p_publish boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w record;
  ex record;
  prev public.personal_records;
  best_w record;
  best_e record;
  prs jsonb := '[]'::jsonb;
  v_volume numeric;
  v_sets integer;
begin
  select * into w from public.workouts
  where id = p_workout_id and user_id = auth.uid()
  for update;
  if not found or w.status <> 'in_progress' then
    raise exception 'Entrenamiento no encontrado o ya terminado' using errcode = '42501';
  end if;

  delete from public.workout_sets s
  using public.workout_exercises we
  where we.id = s.workout_exercise_id and we.workout_id = p_workout_id
    and (not s.is_done or s.reps is null or s.reps = 0);

  delete from public.workout_exercises we
  where we.workout_id = p_workout_id
    and not exists (select 1 from public.workout_sets s where s.workout_exercise_id = we.id);

  select coalesce(sum(coalesce(s.weight_kg, 0) * s.reps), 0), count(*)
    into v_volume, v_sets
  from public.workout_sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  where we.workout_id = p_workout_id;

  if v_sets = 0 then
    raise exception 'Marcá al menos una serie como hecha para guardar el entrenamiento' using errcode = '22023';
  end if;

  update public.workout_sets s set is_pr = false
  from public.workout_exercises we
  where we.id = s.workout_exercise_id and we.workout_id = p_workout_id;

  for ex in
    select distinct we.exercise_id, e.name
    from public.workout_exercises we
    join public.exercises e on e.id = we.exercise_id
    where we.workout_id = p_workout_id
  loop
    select s.id, s.weight_kg, s.reps into best_w
    from public.workout_sets s
    join public.workout_exercises we on we.id = s.workout_exercise_id
    where we.workout_id = p_workout_id and we.exercise_id = ex.exercise_id and s.weight_kg > 0
    order by s.weight_kg desc, s.reps desc
    limit 1;

    continue when best_w.id is null;

    select s.id, s.weight_kg, s.reps, round(s.weight_kg * (1 + s.reps / 30.0), 2) as e1rm into best_e
    from public.workout_sets s
    join public.workout_exercises we on we.id = s.workout_exercise_id
    where we.workout_id = p_workout_id and we.exercise_id = ex.exercise_id and s.weight_kg > 0
    order by s.weight_kg * (1 + s.reps / 30.0) desc
    limit 1;

    select * into prev from public.personal_records
    where user_id = auth.uid() and exercise_id = ex.exercise_id;

    if prev.user_id is not null then
      if best_w.weight_kg > prev.best_weight
         or (best_w.weight_kg = prev.best_weight and best_w.reps > prev.best_weight_reps) then
        update public.workout_sets set is_pr = true where id = best_w.id;
        prs := prs || jsonb_build_object(
          'exercise_id', ex.exercise_id, 'name', ex.name, 'weight_kg', best_w.weight_kg, 'reps', best_w.reps);
      elsif best_e.e1rm > prev.best_e1rm then
        update public.workout_sets set is_pr = true where id = best_e.id;
        prs := prs || jsonb_build_object(
          'exercise_id', ex.exercise_id, 'name', ex.name, 'weight_kg', best_e.weight_kg, 'reps', best_e.reps);
      end if;
    end if;

    insert into public.personal_records as pr
      (user_id, exercise_id, best_weight, best_weight_reps, best_e1rm, workout_id, achieved_at)
    values (auth.uid(), ex.exercise_id, best_w.weight_kg, best_w.reps, best_e.e1rm, p_workout_id, now())
    on conflict (user_id, exercise_id) do update set
      best_weight = greatest(pr.best_weight, excluded.best_weight),
      best_weight_reps = case
        when excluded.best_weight > pr.best_weight then excluded.best_weight_reps
        when excluded.best_weight = pr.best_weight then greatest(pr.best_weight_reps, excluded.best_weight_reps)
        else pr.best_weight_reps end,
      best_e1rm = greatest(pr.best_e1rm, excluded.best_e1rm),
      workout_id = case
        when excluded.best_weight > pr.best_weight or excluded.best_e1rm > pr.best_e1rm then excluded.workout_id
        else pr.workout_id end,
      achieved_at = case
        when excluded.best_weight > pr.best_weight or excluded.best_e1rm > pr.best_e1rm then excluded.achieved_at
        else pr.achieved_at end;
  end loop;

  update public.workouts set
    status = 'finished',
    ended_at = greatest(now(), started_at),
    total_volume = v_volume,
    total_sets = v_sets,
    is_published = coalesce(p_publish, false)
  where id = p_workout_id;

  return jsonb_build_object('total_volume', v_volume, 'total_sets', v_sets, 'prs', prs);
end;
$$;

-- ───────────────────────── Rutinas ─────────────────────────
-- Reemplaza los ejercicios de una rutina propia (lo usa el editor de rutinas).
-- Formato de p_items: [{ "exercise_id", "target_sets", "target_reps", "rest_seconds" }]
create or replace function public.save_routine(p_routine_id uuid, p_name text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid uuid := p_routine_id;
  it jsonb;
  pos integer := 0;
begin
  if char_length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'Poné un nombre a la rutina' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 40 then
    raise exception 'Agregá al menos un ejercicio' using errcode = '22023';
  end if;

  if rid is null then
    insert into public.routines (user_id, name) values (auth.uid(), left(btrim(p_name), 60)) returning id into rid;
  else
    update public.routines set name = left(btrim(p_name), 60)
    where id = rid and user_id = auth.uid();
    if not found then
      raise exception 'Rutina no encontrada' using errcode = '42501';
    end if;
    delete from public.routine_exercises where routine_id = rid;
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    if not exists (
      select 1 from public.exercises e
      where e.id = (it ->> 'exercise_id')::uuid and (e.created_by is null or e.created_by = auth.uid())
    ) then
      raise exception 'Ejercicio inválido' using errcode = '22023';
    end if;
    insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
    values (
      rid,
      (it ->> 'exercise_id')::uuid,
      pos,
      coalesce((it ->> 'target_sets')::int, 3),
      (it ->> 'target_reps')::int,
      coalesce((it ->> 'rest_seconds')::int, 120)
    );
    pos := pos + 1;
  end loop;

  return rid;
end;
$$;

revoke execute on function
  public.sync_workout(uuid, text, jsonb),
  public.previous_sets(uuid[]),
  public.finish_workout(uuid, boolean),
  public.save_routine(uuid, text, jsonb)
from public, anon;
grant execute on function
  public.sync_workout(uuid, text, jsonb),
  public.previous_sets(uuid[]),
  public.finish_workout(uuid, boolean),
  public.save_routine(uuid, text, jsonb)
to authenticated;

-- ===== supabase/migrations/20261008000100_social.sql =====
-- Banca · Fase 3: feed, copiar rutina, "seguido por", bloqueados y fotos de perfil
-- Las funciones de lectura son `security invoker`: RLS decide qué se ve. Solo las que necesitan
-- cruzar datos de otras personas son `security definer`, y devuelven lo mínimo.

-- ───────────────────────── Feed de entrenamientos ─────────────────────────
-- p_tab: 'siguiendo' | 'sede' | 'gimnasio'. Paginado por fecha (p_before).
-- En "sede" solo aparecen quienes muestran su sede (o vos), para no revelar dónde entrena
-- alguien que eligió ocultarlo.
create or replace function public.feed_workouts(p_tab text, p_before timestamptz default null, p_limit integer default 20)
returns table (
  id uuid,
  title text,
  started_at timestamptz,
  ended_at timestamptz,
  total_volume numeric,
  total_sets integer,
  branch_name text,
  author_id uuid,
  author_username text,
  author_name text,
  author_avatar text,
  like_count integer,
  comment_count integer,
  liked boolean,
  exercises jsonb,
  top_pr jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    w.id, w.title, w.started_at, w.ended_at, w.total_volume, w.total_sets,
    case when pp.branch_id is not null then b.name end,
    pp.id, pp.username, pp.full_name, pp.avatar_url,
    (select count(*)::int from public.likes l where l.workout_id = w.id),
    (select count(*)::int from public.comments c where c.workout_id = w.id),
    exists (select 1 from public.likes l where l.workout_id = w.id and l.user_id = auth.uid()),
    (
      select coalesce(jsonb_agg(jsonb_build_object('name', e.name, 'sets', x.n) order by x.position), '[]'::jsonb)
      from (
        select we.exercise_id, we.position, count(s.id)::int as n
        from public.workout_exercises we
        left join public.workout_sets s on s.workout_exercise_id = we.id
        where we.workout_id = w.id
        group by we.id, we.exercise_id, we.position
      ) x
      join public.exercises e on e.id = x.exercise_id
    ),
    (
      select jsonb_build_object('name', e.name, 'weight_kg', s.weight_kg, 'reps', s.reps)
      from public.workout_sets s
      join public.workout_exercises we on we.id = s.workout_exercise_id
      join public.exercises e on e.id = we.exercise_id
      where we.workout_id = w.id and s.is_pr
      order by s.weight_kg desc
      limit 1
    )
  from public.workouts w
  join public.profiles_public pp on pp.id = w.user_id
  left join public.branches b on b.id = w.branch_id
  where w.is_published
    and w.status = 'finished'
    and (p_before is null or w.started_at < p_before)
    and case p_tab
      when 'siguiendo' then
        w.user_id = auth.uid() or public.is_accepted_follower(auth.uid(), w.user_id)
      when 'sede' then
        w.branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
        and (w.user_id = auth.uid() or pp.branch_id is not null)
      when 'gimnasio' then
        public.gym_of_branch(w.branch_id) = public.my_gym_id()
      else false
    end
  order by w.started_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- ───────────────────────── Feed de "busco compañero" ─────────────────────────
create or replace function public.feed_partner_posts(p_scope text, p_before timestamptz default null, p_limit integer default 10)
returns table (
  id uuid,
  topic text,
  days text[],
  time_label text,
  body text,
  is_open boolean,
  created_at timestamptz,
  branch_name text,
  author_id uuid,
  author_username text,
  author_name text,
  author_avatar text,
  joined_count integer,
  joined boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    pp_.id, pp_.topic, pp_.days, pp_.time_label, pp_.body, pp_.is_open, pp_.created_at,
    b.name,
    a.id, a.username, a.full_name, a.avatar_url,
    (select count(*)::int from public.partner_requests r where r.post_id = pp_.id),
    exists (select 1 from public.partner_requests r where r.post_id = pp_.id and r.user_id = auth.uid())
  from public.partner_posts pp_
  join public.profiles_public a on a.id = pp_.user_id
  join public.branches b on b.id = pp_.branch_id
  where pp_.is_open
    and (p_before is null or pp_.created_at < p_before)
    and case p_scope
      when 'sede' then pp_.branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
      when 'gimnasio' then true -- RLS ya limita al gimnasio propio
      else false
    end
  order by pp_.created_at desc
  limit least(greatest(p_limit, 1), 30)
$$;

-- ───────────────────────── Copiar rutina ─────────────────────────
-- Crea una rutina propia a partir de un entrenamiento visible (RLS). Los ejercicios propios de
-- otra persona no se copian porque no son visibles.
create or replace function public.copy_workout_as_routine(p_workout_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  w record;
  rid uuid;
begin
  select id, user_id, title into w from public.workouts
  where id = p_workout_id and status = 'finished';
  if not found then
    raise exception 'Entrenamiento no encontrado' using errcode = '42501';
  end if;

  insert into public.routines (user_id, name, copied_from_user_id)
  values (auth.uid(), left(w.title, 60), case when w.user_id <> auth.uid() then w.user_id end)
  returning id into rid;

  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
  select
    rid,
    we.exercise_id,
    row_number() over (order by we.position) - 1,
    greatest(1, least(20, count(s.id)))::int,
    nullif(round(avg(s.reps))::int, 0),
    we.rest_seconds
  from public.workout_exercises we
  join public.exercises e on e.id = we.exercise_id
  left join public.workout_sets s on s.workout_exercise_id = we.id
  where we.workout_id = p_workout_id
  group by we.id, we.exercise_id, we.position, we.rest_seconds;

  if not found then
    raise exception 'Este entrenamiento no tiene ejercicios para copiar' using errcode = '22023';
  end if;

  return rid;
end;
$$;

-- ───────────────────────── "Seguido por" ─────────────────────────
-- Gente que vos seguís y que también sigue a p_target (como Instagram). Excluye bloqueos con
-- vos o con p_target. Devuelve hasta 3 nombres de usuario y el total.
create or replace function public.followed_by_mutuals(p_target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select p.username
    from public.follows mine
    join public.follows theirs
      on theirs.follower_id = mine.following_id and theirs.following_id = p_target and theirs.status = 'accepted'
    join public.profiles p on p.id = mine.following_id
    where auth.uid() is not null
      and mine.follower_id = auth.uid()
      and mine.status = 'accepted'
      and p.username is not null
      and not public.is_blocked_between(auth.uid(), mine.following_id)
      and not public.is_blocked_between(p_target, mine.following_id)
      and not public.is_blocked_between(auth.uid(), p_target)
  )
  select jsonb_build_object(
    'count', (select count(*) from m),
    'usernames', coalesce((select jsonb_agg(username) from (select username from m order by username limit 3) t), '[]'::jsonb)
  )
$$;

-- ───────────────────────── Bloqueados ─────────────────────────
-- profiles_public oculta a las personas bloqueadas; para poder desbloquearlas hace falta su nombre.
create or replace function public.my_blocked_users()
returns table (id uuid, username text, full_name text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.full_name, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc
$$;

revoke execute on function
  public.feed_workouts(text, timestamptz, integer),
  public.feed_partner_posts(text, timestamptz, integer),
  public.copy_workout_as_routine(uuid),
  public.followed_by_mutuals(uuid),
  public.my_blocked_users()
from public, anon;
grant execute on function
  public.feed_workouts(text, timestamptz, integer),
  public.feed_partner_posts(text, timestamptz, integer),
  public.copy_workout_as_routine(uuid),
  public.followed_by_mutuals(uuid),
  public.my_blocked_users()
to authenticated;

-- ───────────────────────── Fotos de perfil ─────────────────────────
-- Bucket público (la foto es parte del perfil básico, visible para todos). Cada persona solo
-- escribe dentro de su carpeta: avatars/<user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: subir la propia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: actualizar la propia" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: borrar la propia" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
