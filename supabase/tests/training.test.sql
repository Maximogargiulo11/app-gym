-- Pruebas de la Fase 2 (entrenamientos): sync, terminar, récords, "anterior" y rutinas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

\set demo  '''30000000-0000-0000-0000-000000000001'''
\set lucia '''30000000-0000-0000-0000-000000000002'''
\set w1    '''50000000-0000-0000-0000-000000000001'''

-- IDs de ejercicios, tomados como admin.
select set_config('test.banca', (select id::text from public.exercises where name = 'Press banca con barra' and created_by is null), false);
select set_config('test.militar', (select id::text from public.exercises where name = 'Press militar con mancuernas' and created_by is null), false);

-- Mejor marca previa de demo en press banca (del seed).
select set_config('test.prev_best',
  (select best_weight::text from public.personal_records
   where user_id = :demo and exercise_id = current_setting('test.banca')::uuid), false);

select pg_temp.login(:demo);

-- Si demo tiene un entrenamiento en curso del seed, no debería; el índice permite uno solo.
select lives_ok(
  format($$ insert into public.workouts (id, title) values (%L, 'Empuje · Día A') $$, :w1),
  'demo empieza un entrenamiento');
select throws_ok(
  $$ insert into public.workouts (title) values ('Otro') $$,
  '23505', null, 'solo un entrenamiento en curso por persona');

-- Sincroniza dos ejercicios: press banca con una serie récord y una sin marcar; militar con una serie.
select lives_ok(format($$ select public.sync_workout(%L, 'Empuje · Día A', %L::jsonb) $$, :w1, jsonb_build_array(
  jsonb_build_object('id', '60000000-0000-0000-0000-000000000001', 'exercise_id', current_setting('test.banca'),
    'position', 0, 'rest_seconds', 120, 'sets', jsonb_build_array(
      jsonb_build_object('id', '70000000-0000-0000-0000-000000000001', 'set_number', 1, 'weight_kg', 60, 'reps', 10, 'is_done', true),
      jsonb_build_object('id', '70000000-0000-0000-0000-000000000002', 'set_number', 2,
        'weight_kg', current_setting('test.prev_best')::numeric + 5, 'reps', 3, 'is_done', true),
      jsonb_build_object('id', '70000000-0000-0000-0000-000000000003', 'set_number', 3, 'weight_kg', 70, 'reps', 8, 'is_done', false))),
  jsonb_build_object('id', '60000000-0000-0000-0000-000000000002', 'exercise_id', current_setting('test.militar'),
    'position', 1, 'rest_seconds', 90, 'sets', jsonb_build_array(
      jsonb_build_object('id', '70000000-0000-0000-0000-000000000004', 'set_number', 1, 'weight_kg', 2, 'reps', 10, 'is_done', true)))
)), 'sync_workout guarda ejercicios y series');

select is((select count(*) from public.workout_sets s join public.workout_exercises we on we.id = s.workout_exercise_id
           where we.workout_id = :w1), 4::bigint, 'quedan 4 series guardadas');

-- Volver a sincronizar reemplaza (no duplica).
select lives_ok(format($$ select public.sync_workout(%L, 'Empuje · Día A', %L::jsonb) $$, :w1, jsonb_build_array(
  jsonb_build_object('id', '60000000-0000-0000-0000-000000000001', 'exercise_id', current_setting('test.banca'),
    'position', 0, 'rest_seconds', 120, 'sets', jsonb_build_array(
      jsonb_build_object('id', '70000000-0000-0000-0000-000000000001', 'set_number', 1, 'weight_kg', 60, 'reps', 10, 'is_done', true),
      jsonb_build_object('id', '70000000-0000-0000-0000-000000000002', 'set_number', 2,
        'weight_kg', current_setting('test.prev_best')::numeric + 5, 'reps', 3, 'is_done', true),
      jsonb_build_object('id', '70000000-0000-0000-0000-000000000003', 'set_number', 3, 'weight_kg', 70, 'reps', 8, 'is_done', false))),
  jsonb_build_object('id', '60000000-0000-0000-0000-000000000002', 'exercise_id', current_setting('test.militar'),
    'position', 1, 'rest_seconds', 90, 'sets', jsonb_build_array(
      jsonb_build_object('id', '70000000-0000-0000-0000-000000000004', 'set_number', 1, 'weight_kg', 2, 'reps', 10, 'is_done', true)))
)), 'sync_workout es idempotente');
select is((select count(*) from public.workout_exercises where workout_id = :w1), 2::bigint, 'no duplica ejercicios');

-- "Anterior": devuelve series de entrenamientos terminados propios.
select ok((select count(*) from public.previous_sets(array[current_setting('test.banca')::uuid])) > 0,
  'previous_sets devuelve la última vez que demo hizo press banca');

-- Otra persona no puede tocar el entrenamiento de demo.
select pg_temp.login(:lucia);
select throws_ok(format($$ select public.sync_workout(%L, 'hack', '[]'::jsonb) $$, :w1),
  '42501', null, 'lucia no puede sincronizar el entrenamiento de demo');
select throws_ok(format($$ select public.finish_workout(%L, true) $$, :w1),
  '42501', null, 'lucia no puede terminar el entrenamiento de demo');
select is((select count(*) from public.workouts where id = :w1), 0::bigint,
  'el entrenamiento en curso no es visible para otros');

-- Terminar.
select pg_temp.login(:demo);
select is(
  (select jsonb_array_length(public.finish_workout(:w1, true) -> 'prs')), 1,
  'finish_workout detecta 1 récord (press banca)');
select is((select status from public.workouts where id = :w1), 'finished', 'queda terminado');
select is((select is_published from public.workouts where id = :w1), true, 'queda publicado');
select is((select count(*) from public.workout_sets where id = '70000000-0000-0000-0000-000000000003'), 0::bigint,
  'la serie sin marcar se descarta');
select is((select is_pr from public.workout_sets where id = '70000000-0000-0000-0000-000000000002'), true,
  'la serie récord queda marcada');
select is((select best_weight from public.personal_records
           where user_id = :demo and exercise_id = current_setting('test.banca')::uuid),
  current_setting('test.prev_best')::numeric + 5, 'el récord personal se actualiza');
select throws_ok(format($$ select public.finish_workout(%L, true) $$, :w1),
  '42501', null, 'no se puede terminar dos veces');

-- Rutinas.
select ok((select public.save_routine(null, 'Empuje', jsonb_build_array(
  jsonb_build_object('exercise_id', current_setting('test.banca'), 'target_sets', 4, 'target_reps', 8)))) is not null,
  'save_routine crea una rutina');
select throws_ok($$ select public.save_routine(null, 'Vacía', '[]'::jsonb) $$,
  '22023', null, 'una rutina necesita al menos un ejercicio');

select * from finish();
rollback;
