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
