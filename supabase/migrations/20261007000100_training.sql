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
