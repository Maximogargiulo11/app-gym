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
