-- Pruebas de la Fase 3 (social): feed, busco compañero, copiar rutina, "seguido por" y bloqueados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

\set demo   '''30000000-0000-0000-0000-000000000001'''
\set lucia  '''30000000-0000-0000-0000-000000000002'''
\set tomas  '''30000000-0000-0000-0000-000000000003'''
\set mateo  '''30000000-0000-0000-0000-000000000005'''
\set nico   '''30000000-0000-0000-0000-000000000006'''
\set camila '''30000000-0000-0000-0000-000000000007'''
\set sofia  '''30000000-0000-0000-0000-000000000008'''
\set julian '''30000000-0000-0000-0000-000000000009'''
\set bruno  '''30000000-0000-0000-0000-000000000011'''

-- Nicolás oculta su sede: no tiene que aparecer en la pestaña "sede" de otros.
update public.profiles set show_branch = false where id = :nico;

-- Un entrenamiento privado de camila y uno de bruno, tomados como admin.
select set_config('test.camila_w', (select id::text from public.workouts where user_id = :camila limit 1), false);
select set_config('test.bruno_w', (select id::text from public.workouts where user_id = :bruno limit 1), false);
select set_config('test.lucia_w', (select id::text from public.workouts where user_id = :lucia order by started_at desc limit 1), false);

select pg_temp.login(:demo);

-- ───── Feed "siguiendo" ─────
select ok((select count(*) from public.feed_workouts('siguiendo', null, 50) where author_id = :lucia) > 0,
  'siguiendo: aparece lucia (la sigo)');
select ok((select count(*) from public.feed_workouts('siguiendo', null, 50) where author_id = :mateo) > 0,
  'siguiendo: aparece mateo (privado, aceptado)');
select is((select count(*) from public.feed_workouts('siguiendo', null, 50) where author_id = :camila), 0::bigint,
  'siguiendo: camila (solicitud pendiente) no aparece');
select is((select count(*) from public.feed_workouts('siguiendo', null, 50) where author_id not in (:demo, :lucia, :tomas, :mateo)),
  0::bigint, 'siguiendo: solo gente que sigo (o yo)');

-- ───── Feed "sede" ─────
select is((select count(*) from public.feed_workouts('sede', null, 200) where author_id = :camila), 0::bigint,
  'sede: camila es privada y no la sigo → no aparece');
select is((select count(*) from public.feed_workouts('sede', null, 200) where author_id = :bruno), 0::bigint,
  'sede: bruno me bloqueó → no aparece');
select is((select count(*) from public.feed_workouts('sede', null, 200) where author_id = :nico), 0::bigint,
  'sede: quien oculta su sede no aparece en la pestaña de la sede');
select is((select count(*) from public.feed_workouts('sede', null, 200) where author_id = :julian), 0::bigint,
  'sede: julián es de Sede Centro → no aparece en Chacabuco');
select ok((select count(*) from public.feed_workouts('gimnasio', null, 200) where author_id = :julian) > 0,
  'gimnasio: julián (otra sede, público) sí aparece');
select ok((select count(*) from public.feed_workouts('gimnasio', null, 200) where author_id = :nico) > 0,
  'gimnasio: nicolás aparece en todo el gimnasio (sin mostrar su sede)');
select is((select count(*) from public.feed_workouts('gimnasio', null, 200) where author_id = :nico and branch_name is not null),
  0::bigint, 'gimnasio: la sede de nicolás no se muestra');

-- Paginación.
select is((select count(*) from public.feed_workouts('gimnasio', null, 5)), 5::bigint, 'el límite funciona');
select ok((select max(started_at) from public.feed_workouts('gimnasio',
  (select min(started_at) from public.feed_workouts('gimnasio', null, 5)), 5))
  < (select min(started_at) from public.feed_workouts('gimnasio', null, 5)), 'p_before pagina hacia atrás');

-- ───── Busco compañero ─────
select ok((select count(*) from public.feed_partner_posts('sede', null, 10) where author_id = :tomas) > 0,
  'busco compañero: aparece el post de tomás');

-- ───── Copiar rutina ─────
select ok((select public.copy_workout_as_routine(current_setting('test.lucia_w')::uuid)) is not null,
  'puedo copiar la rutina de un entrenamiento visible');
select is((select copied_from_user_id from public.routines where user_id = :demo order by created_at desc limit 1), :lucia::uuid,
  'la rutina copiada recuerda de quién es');
select throws_ok(format($$ select public.copy_workout_as_routine(%L) $$, current_setting('test.camila_w')),
  '42501', null, 'no puedo copiar un entrenamiento que no veo');

-- ───── Seguido por ─────
-- demo sigue a lucia y lucia sigue a lucas → al ver a lucas, "seguido por lucia.m".
select is((public.followed_by_mutuals('30000000-0000-0000-0000-000000000004') -> 'usernames' ->> 0), 'lucia.m',
  'seguido por: muestra a quien sigo que también lo sigue');

-- ───── Bloqueados ─────
select is((select count(*) from public.my_blocked_users()), 0::bigint, 'demo no bloqueó a nadie');
select pg_temp.login(:bruno);
select is((select username from public.my_blocked_users()), 'maxig', 'bruno ve a quién bloqueó');

select * from finish();
rollback;
