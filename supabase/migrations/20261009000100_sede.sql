-- Banca · Fase 4: check-in con QR, racha, rankings del mes, desafíos entre sedes y admin de QR.
-- Los check-ins solo los ve su dueño: todo lo que cruza datos de otras personas devuelve
-- agregados (cantidades) o solo a quienes eligieron aparecer en rankings.

-- ───────────────────────── Token del QR ─────────────────────────
-- El QR impreso lleva /checkin?b=<slug>&t=<token>. El token es un HMAC de "slug:qr_version"
-- con el secreto de la sede (branch_secrets, ilegible para los clientes). Rotar el QR sube
-- qr_version y deja inválidos los impresos anteriores.
create or replace function public.qr_token_for(p_branch_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(encode(extensions.hmac(b.slug || ':' || s.qr_version, s.qr_secret, 'sha256'), 'hex'), 32)
  from public.branches b
  join public.branch_secrets s on s.branch_id = b.id
  where b.id = p_branch_id
$$;

-- ───────────────────────── Racha ─────────────────────────
-- Días seguidos con check-in que terminan hoy o ayer (si hoy todavía no fuiste, la racha sigue viva).
create or replace function public.my_streak()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with d as (
    select distinct local_date from public.check_ins where user_id = auth.uid()
  ),
  g as (
    select local_date, local_date - (row_number() over (order by local_date))::int as grp from d
  ),
  last as (
    select local_date, grp from g order by local_date desc limit 1
  )
  select coalesce((
    select count(*)::int from g join last on g.grp = last.grp
    where last.local_date >= public.gym_today() - 1
  ), 0)
$$;

-- ───────────────────────── Check-in ─────────────────────────
-- Valida el QR en el servidor, exige que la sede sea de tu gimnasio y registra un check-in
-- por día y sede. Errores: 'qr_invalido', 'otro_gimnasio', 'sin_sesion'.
create or replace function public.perform_checkin(p_slug text, p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_branch public.branches%rowtype;
  v_gym_name text;
  v_id uuid;
  v_at timestamptz;
begin
  if v_uid is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;

  select * into v_branch from public.branches where slug = p_slug;
  if v_branch.id is null or p_token is null or p_token <> public.qr_token_for(v_branch.id) then
    raise exception 'qr_invalido' using errcode = '22023';
  end if;

  if v_branch.gym_id is distinct from public.my_gym_id() then
    raise exception 'otro_gimnasio' using errcode = '42501';
  end if;

  insert into public.check_ins (user_id, branch_id)
  values (v_uid, v_branch.id)
  on conflict (user_id, branch_id, local_date) do nothing
  returning id, created_at into v_id, v_at;

  if v_id is null then
    select created_at into v_at from public.check_ins
    where user_id = v_uid and branch_id = v_branch.id and local_date = public.gym_today();
  end if;

  select name into v_gym_name from public.gyms where id = v_branch.gym_id;

  return jsonb_build_object(
    'branch_name', v_branch.name,
    'gym_name', v_gym_name,
    'already', v_id is null,
    'checked_at', v_at,
    'streak', public.my_streak()
  );
end;
$$;

-- ───────────────────────── Rankings del mes ─────────────────────────
-- Base interna (no se expone): mejor serie del mes por persona y ejercicio entre los socios de
-- una sede que aparecen en rankings, muestran su sede (o sos vos) y no tienen bloqueo con vos.
create or replace function public.ranking_entries(p_branch uuid, p_month date)
returns table (user_id uuid, exercise_id uuid, weight_kg numeric, reps integer, done_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select date_trunc('month', coalesce(p_month, public.gym_today()))::date as m
  )
  select distinct on (w.user_id, we.exercise_id)
    w.user_id, we.exercise_id, s.weight_kg, s.reps, coalesce(s.completed_at, w.started_at)
  from public.profiles p
  join public.workouts w on w.user_id = p.id
  join public.workout_exercises we on we.workout_id = w.id
  join public.workout_sets s on s.workout_exercise_id = we.id
  cross join bounds
  where auth.uid() is not null
    and public.gym_of_branch(p_branch) = public.my_gym_id()
    and p.branch_id = p_branch
    and p.onboarded_at is not null
    and p.show_in_rankings
    and (p.show_branch or p.id = auth.uid())
    and not public.is_blocked_between(auth.uid(), p.id)
    and w.status = 'finished'
    and s.is_done
    and s.weight_kg > 0
    and coalesce(s.reps, 0) > 0
    and (w.started_at at time zone 'America/Argentina/Cordoba')::date >= bounds.m
    and (w.started_at at time zone 'America/Argentina/Cordoba')::date < (bounds.m + interval '1 month')::date
  order by w.user_id, we.exercise_id, s.weight_kg desc, s.reps desc, coalesce(s.completed_at, w.started_at)
$$;

-- Ejercicios con al menos una marca este mes en la sede, de más a menos participantes.
create or replace function public.ranking_exercises(p_branch uuid, p_month date default null)
returns table (exercise_id uuid, name text, participants integer)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.name, count(*)::int
  from public.ranking_entries(p_branch, p_month) r
  join public.exercises e on e.id = r.exercise_id
  group by e.id, e.name
  order by count(*) desc, e.name
$$;

-- Top 10 del mes en un ejercicio, más tu fila si quedaste afuera.
create or replace function public.branch_monthly_ranking(p_branch uuid, p_exercise uuid, p_month date default null)
returns table (
  rank integer,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  weight_kg numeric,
  reps integer,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      (rank() over (order by r.weight_kg desc, r.reps desc))::int as rank,
      r.user_id, p.username, p.full_name, p.avatar_url, r.weight_kg, r.reps,
      r.user_id = auth.uid() as is_me,
      r.done_at
    from public.ranking_entries(p_branch, p_month) r
    join public.profiles p on p.id = r.user_id
    where r.exercise_id = p_exercise
  )
  select rank, user_id, username, full_name, avatar_url, weight_kg, reps, is_me
  from ranked
  where rank <= 10 or is_me
  order by rank, done_at
$$;

-- ───────────────────────── Desafíos ─────────────────────────
-- Progreso por sede: días entrenados (check-ins) entre todos sus socios dentro del período.
-- Solo cantidades; my_days es lo que sumaste vos en esa sede.
create or replace function public.challenge_progress(p_challenge uuid)
returns table (branch_id uuid, branch_name text, days integer, my_days integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.name,
    (select count(*)::int from public.check_ins ci
      where ci.branch_id = b.id and ci.local_date between c.starts_on and c.ends_on),
    (select count(*)::int from public.check_ins ci
      where ci.branch_id = b.id and ci.user_id = auth.uid() and ci.local_date between c.starts_on and c.ends_on)
  from public.challenges c
  join public.challenge_branches cb on cb.challenge_id = c.id
  join public.branches b on b.id = cb.branch_id
  where c.id = p_challenge
    and auth.uid() is not null
    and c.gym_id = public.my_gym_id()
  order by b.name
$$;

-- ───────────────────────── Admin del gimnasio ─────────────────────────

create or replace function public.branch_qr_token(p_branch_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_gym_staff(public.gym_of_branch(p_branch_id)) then
    raise exception 'solo_staff' using errcode = '42501';
  end if;
  return public.qr_token_for(p_branch_id);
end;
$$;

-- Invalida los QR impresos de la sede: el token nuevo usa la versión siguiente.
create or replace function public.rotate_branch_qr(p_branch_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_version integer;
begin
  if not public.is_gym_staff(public.gym_of_branch(p_branch_id)) then
    raise exception 'solo_staff' using errcode = '42501';
  end if;
  update public.branch_secrets set qr_version = qr_version + 1
  where branch_id = p_branch_id
  returning qr_version into v_version;
  return v_version;
end;
$$;

create or replace function public.create_challenge(
  p_title text,
  p_description text,
  p_starts_on date,
  p_ends_on date,
  p_branch_ids uuid[]
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_gym uuid := public.my_gym_id();
  v_id uuid;
begin
  if v_gym is null or not public.is_gym_staff(v_gym) then
    raise exception 'solo_staff' using errcode = '42501';
  end if;
  if char_length(coalesce(trim(p_title), '')) not between 1 and 80 then
    raise exception 'titulo_invalido' using errcode = '22023';
  end if;
  if p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on then
    raise exception 'fechas_invalidas' using errcode = '22023';
  end if;
  if coalesce(array_length(p_branch_ids, 1), 0) < 2
    or exists (select 1 from unnest(p_branch_ids) bid where public.gym_of_branch(bid) is distinct from v_gym)
  then
    raise exception 'sedes_invalidas' using errcode = '22023';
  end if;

  insert into public.challenges (gym_id, title, description, starts_on, ends_on)
  values (v_gym, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), p_starts_on, p_ends_on)
  returning id into v_id;

  insert into public.challenge_branches (challenge_id, branch_id)
  select distinct v_id, bid from unnest(p_branch_ids) bid;

  return v_id;
end;
$$;

create or replace function public.delete_challenge(p_challenge uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.challenges c where c.id = p_challenge and public.is_gym_staff(c.gym_id)
  ) then
    raise exception 'solo_staff' using errcode = '42501';
  end if;
  delete from public.challenges where id = p_challenge;
end;
$$;

-- Códigos de un solo uso para convertirse en admin de un gimnasio. Se guarda solo el SHA-256:
-- el código en texto plano se entrega por fuera del repo. RLS sin políticas: nadie lo lee.
create table public.gym_admin_invites (
  code_hash text primary key,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.gym_admin_invites enable row level security;
revoke all on public.gym_admin_invites from anon, authenticated;

insert into public.gym_admin_invites (code_hash, gym_id) values
  ('4de3debc1fb759de50217099059414ee2b96350954c7f2a3e7cee1b37467b4df', '10000000-0000-0000-0000-000000000001')
on conflict do nothing;

create or replace function public.claim_gym_admin(p_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_gym uuid;
begin
  if v_uid is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;

  update public.gym_admin_invites
  set used_by = v_uid, used_at = now()
  where code_hash = encode(extensions.digest(trim(coalesce(p_code, '')), 'sha256'), 'hex')
    and used_at is null
  returning gym_id into v_gym;

  if v_gym is null then
    return false;
  end if;

  insert into public.gym_staff (gym_id, user_id) values (v_gym, v_uid) on conflict do nothing;
  return true;
end;
$$;

-- ───────────────────────── Permisos de ejecución ─────────────────────────

revoke execute on function
  public.qr_token_for(uuid),
  public.ranking_entries(uuid, date),
  public.my_streak(),
  public.perform_checkin(text, text),
  public.ranking_exercises(uuid, date),
  public.branch_monthly_ranking(uuid, uuid, date),
  public.challenge_progress(uuid),
  public.branch_qr_token(uuid),
  public.rotate_branch_qr(uuid),
  public.create_challenge(text, text, date, date, uuid[]),
  public.delete_challenge(uuid),
  public.claim_gym_admin(text)
from public, anon;

-- qr_token_for y ranking_entries quedan solo para uso interno.
revoke execute on function public.qr_token_for(uuid), public.ranking_entries(uuid, date) from authenticated;

grant execute on function
  public.my_streak(),
  public.perform_checkin(text, text),
  public.ranking_exercises(uuid, date),
  public.branch_monthly_ranking(uuid, uuid, date),
  public.challenge_progress(uuid),
  public.branch_qr_token(uuid),
  public.rotate_branch_qr(uuid),
  public.create_challenge(text, text, date, date, uuid[]),
  public.delete_challenge(uuid),
  public.claim_gym_admin(text)
to authenticated;
