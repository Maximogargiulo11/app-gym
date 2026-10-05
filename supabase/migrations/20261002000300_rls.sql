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
