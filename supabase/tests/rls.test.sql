-- Pruebas de privacidad (RLS) con pgTAP. Correr con: npm run test:rls
-- Usan los usuarios del seed:
--   demo (pública) sigue a lucia (pública) y a mateo (privada, aceptada);
--   demo mandó solicitud a camila (privada, pendiente); bruno bloqueó a demo.

begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

-- Helpers para "loguearse" como un usuario del seed.
create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

create function pg_temp.as_admin() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

\set demo   '''30000000-0000-0000-0000-000000000001'''
\set lucia  '''30000000-0000-0000-0000-000000000002'''
\set tomas  '''30000000-0000-0000-0000-000000000003'''
\set mateo  '''30000000-0000-0000-0000-000000000005'''
\set camila '''30000000-0000-0000-0000-000000000007'''
\set sofia  '''30000000-0000-0000-0000-000000000008'''
\set bruno  '''30000000-0000-0000-0000-000000000011'''
\set chacabuco '''20000000-0000-0000-0000-000000000001'''

-- Un entrenamiento de camila (privada), tomado como admin para intentar interactuar con él.
select set_config('test.camila_workout',
  (select id::text from public.workouts where user_id = :camila limit 1), false);

-- ───────────── Sin sesión ─────────────
select pg_temp.logout();

select throws_ok($$ select * from public.workouts $$, '42501', null, 'anon: no lee entrenamientos');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon: no lee perfiles');
select throws_ok($$ select * from public.profiles_public $$, '42501', null, 'anon: no lee la vista pública');
select throws_ok($$ select * from public.check_ins $$, '42501', null, 'anon: no lee check-ins');

-- ───────────── demo: visibilidad de entrenamientos ─────────────
select pg_temp.login(:demo);

select ok((select count(*) from public.workouts where user_id = :lucia) > 0,
  'pública: demo ve los entrenamientos de lucia');
select ok((select count(*) from public.workouts where user_id = :tomas) > 0,
  'pública sin seguir: demo ve los de tomas igual');
select ok((select count(*) from public.workouts where user_id = :mateo) > 0,
  'privada + seguimiento aceptado: demo ve los de mateo');
select is((select count(*) from public.workouts where user_id = :camila), 0::bigint,
  'privada + solicitud pendiente: demo NO ve los de camila');
select is((select count(*) from public.workouts where user_id = :sofia), 0::bigint,
  'privada sin seguir: demo NO ve los de sofia');
select is((select count(*) from public.workouts where user_id = :bruno), 0::bigint,
  'bloqueo: demo NO ve los entrenamientos de quien lo bloqueó');

select is((select count(*) from public.workout_sets s
           join public.workout_exercises we on we.id = s.workout_exercise_id
           join public.workouts w on w.id = we.workout_id
           where w.user_id = :camila), 0::bigint,
  'privada: tampoco se filtran las series por join');
select is((select count(*) from public.personal_records where user_id = :camila), 0::bigint,
  'privada: demo NO ve los récords de camila');
select ok((select count(*) from public.personal_records where user_id = :lucia) > 0,
  'pública: demo ve los récords de lucia');

-- ───────────── demo: perfiles ─────────────
select is((select count(*) from public.profiles), 1::bigint,
  'profiles: solo se lee la fila propia');
select is((select count(*) from public.profiles_public where id = :camila), 1::bigint,
  'privada: el perfil básico de camila sí aparece');
select is((select usual_schedule from public.profiles_public where id = :camila), null::text,
  'privada: el horario de camila queda oculto');
select is((select can_view_content from public.profiles_public where id = :camila), false,
  'privada: la vista indica que no se puede ver su contenido');
select is((select usual_schedule from public.profiles_public where id = :lucia), 'tarde',
  'pública: el horario de lucia se ve');
select is((select count(*) from public.profiles_public where id = :bruno), 0::bigint,
  'bloqueo: bruno no aparece en la vista pública para demo');
select is((select count(*) from public.profile_stats(:bruno)), 0::bigint,
  'bloqueo: tampoco sus contadores');
select is((select workouts from public.profile_stats(:camila)) > 0, true,
  'privada: los contadores sí se ven');

-- ───────────── Check-ins y secretos ─────────────
select is((select count(*) from public.check_ins where user_id <> :demo), 0::bigint,
  'check-ins: demo solo ve los suyos');
select ok((select count(*) from public.check_ins) > 0, 'check-ins: demo ve los propios');
select throws_ok(
  format($$ insert into public.check_ins (user_id, branch_id) values (%L, %L) $$, :demo, :chacabuco),
  '42501', null, 'check-ins: no se pueden crear desde el cliente');
select ok(public.branch_checkins_today(:chacabuco) >= 0, 'check-ins: el agregado devuelve solo un número');
select throws_ok($$ select qr_secret from public.branch_secrets $$, '42501', null,
  'el secreto del QR no es legible');

-- ───────────── Escrituras ─────────────
select throws_ok(
  format($$ insert into public.workouts (user_id, title) values (%L, 'trucho') $$, :lucia),
  '42501', null, 'no se puede crear un entrenamiento a nombre de otro');
select throws_ok(
  $$ update public.workout_sets set is_pr = true $$,
  '42501', null, 'is_pr lo calcula el servidor, no el cliente');
select throws_ok(
  $$ update public.workouts set status = 'finished' $$,
  '42501', null, 'el estado del entrenamiento no se cambia a mano');
select throws_ok(
  $$ insert into public.likes (workout_id) values (current_setting('test.camila_workout')::uuid) $$,
  '42501', null, 'no se puede dar like a algo que no podés ver');

-- Seguir a una cuenta privada → pendiente; seguir a una pública → aceptada.
select lives_ok(format($$ insert into public.follows (follower_id, following_id) values (%L, %L) $$, :demo, :sofia),
  'demo puede pedir seguir a sofia');
select is((select status from public.follows where follower_id = :demo and following_id = :sofia), 'pending',
  'privada: la solicitud queda pendiente');
select lives_ok(format($$ update public.follows set status = 'accepted' where follower_id = %L and following_id = %L $$, :demo, :sofia),
  'el update de quien pide seguir no falla, pero no afecta filas');
select is((select status from public.follows where follower_id = :demo and following_id = :sofia), 'pending',
  'quien pide seguir no puede autoaceptarse');

-- ───────────── Bloqueo en el otro sentido ─────────────
select pg_temp.login(:bruno);
select is((select count(*) from public.workouts where user_id = :demo), 0::bigint,
  'bloqueo: bruno tampoco ve los entrenamientos de demo');
select throws_ok(format($$ insert into public.follows (follower_id, following_id) values (%L, %L) $$, :bruno, :demo),
  '42501', null, 'bloqueo: bruno no puede seguir a demo');

-- ───────────── Aceptar solicitudes y pasar a pública ─────────────
select pg_temp.login(:sofia);
select lives_ok(format($$ update public.follows set status = 'accepted' where follower_id = %L and following_id = %L $$, :demo, :sofia),
  'sofia acepta la solicitud de demo');

select pg_temp.login(:demo);
select ok((select count(*) from public.workouts where user_id = :sofia) > 0,
  'aceptada: ahora demo ve los entrenamientos de sofia');

select pg_temp.login(:camila);
select lives_ok(format($$ update public.profiles set is_private = false where id = %L $$, :camila),
  'camila pasa su cuenta a pública');
select pg_temp.login(:demo);
select is((select status from public.follows where follower_id = :demo and following_id = :camila), 'accepted',
  'al pasar a pública, las solicitudes pendientes se aceptan');

select * from finish();
rollback;
