-- Pruebas de la Fase 4 (sede): check-in con QR, racha, rankings, desafíos y admin.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

\set demo   '''30000000-0000-0000-0000-000000000001'''
\set lucia  '''30000000-0000-0000-0000-000000000002'''
\set tomas  '''30000000-0000-0000-0000-000000000003'''
\set nico   '''30000000-0000-0000-0000-000000000006'''
\set sofia  '''30000000-0000-0000-0000-000000000008'''
\set bruno  '''30000000-0000-0000-0000-000000000011'''
\set chaca  '''20000000-0000-0000-0000-000000000001'''
\set centro '''20000000-0000-0000-0000-000000000002'''

-- Preparación como admin.
delete from public.check_ins where user_id = :demo and local_date >= public.gym_today() - 1;
update public.profiles set show_in_rankings = false where id = :nico;
update public.profiles set show_branch = false where id = :tomas;
select set_config('test.tok', public.qr_token_for(:chaca), false);

-- Otro gimnasio con su sede, para probar que no se puede hacer check-in afuera del propio.
insert into public.gyms (id, name, slug) values ('10000000-0000-0000-0000-0000000000ff', 'Otro', 'otro-gym');
insert into public.branches (id, gym_id, name, slug)
values ('20000000-0000-0000-0000-0000000000ff', '10000000-0000-0000-0000-0000000000ff', 'Otra sede', 'otra-sede');
insert into public.branch_secrets (branch_id) values ('20000000-0000-0000-0000-0000000000ff');
select set_config('test.tok_otro', public.qr_token_for('20000000-0000-0000-0000-0000000000ff'), false);

-- Código de admin de prueba.
insert into public.gym_admin_invites (code_hash, gym_id)
values (encode(extensions.digest('codigo-de-prueba', 'sha256'), 'hex'), '10000000-0000-0000-0000-000000000001');

-- ───── Sin sesión ─────
set local role anon;
select throws_ok($$ select public.perform_checkin('manantial-chacabuco', 'x') $$, '42501', null,
  'anon no puede hacer check-in');

-- ───── Check-in ─────
select pg_temp.login(:demo);
select is(public.my_streak(), 0, 'sin check-in hoy ni ayer, la racha es 0');
select throws_ok($$ select public.perform_checkin('manantial-chacabuco', 'token-falso') $$, '22023', 'qr_invalido',
  'un token falso no sirve');
select throws_ok($$ select public.perform_checkin('no-existe', 'x') $$, '22023', 'qr_invalido',
  'una sede que no existe no sirve');
select throws_ok(format($$ select public.perform_checkin('otra-sede', %L) $$, current_setting('test.tok_otro')),
  '42501', 'otro_gimnasio', 'no se puede hacer check-in en otro gimnasio');
select is((public.perform_checkin('manantial-chacabuco', current_setting('test.tok')) ->> 'already')::boolean, false,
  'el primer check-in del día se registra');
select is((public.perform_checkin('manantial-chacabuco', current_setting('test.tok')) ->> 'already')::boolean, true,
  'el segundo del día no duplica');
select is((select count(*) from public.check_ins where user_id = :demo and local_date = public.gym_today()), 1::bigint,
  'hay un solo check-in hoy');
select is(public.my_streak(), 1, 'la racha arranca en 1');
select is((select count(*) from public.check_ins where user_id <> :demo), 0::bigint,
  'no veo check-ins de otras personas');
select throws_ok($$ insert into public.check_ins (user_id, branch_id) values (auth.uid(), '20000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'no se puede insertar un check-in sin pasar por el QR');

-- ───── Rankings ─────
select ok((select count(*) from public.ranking_exercises(:chaca)) > 0, 'hay ejercicios con marcas este mes');
select set_config('test.ex', (select exercise_id::text from public.ranking_exercises(:chaca) limit 1), false);
select ok((select count(*) from public.branch_monthly_ranking(:chaca, current_setting('test.ex')::uuid)) > 0,
  'el ranking del ejercicio tiene filas');
select is((select count(*) from public.ranking_exercises(:chaca) e, public.branch_monthly_ranking(:chaca, e.exercise_id) r
  where r.user_id = :nico), 0::bigint, 'quien no aparece en rankings no aparece');
select is((select count(*) from public.ranking_exercises(:chaca) e, public.branch_monthly_ranking(:chaca, e.exercise_id) r
  where r.user_id = :tomas), 0::bigint, 'quien oculta su sede no aparece en el ranking de la sede');
select is((select count(*) from public.ranking_exercises(:chaca) e, public.branch_monthly_ranking(:chaca, e.exercise_id) r
  where r.user_id = :bruno), 0::bigint, 'con bloqueo no aparece');
select is((select count(*) from public.ranking_exercises(:centro) e, public.branch_monthly_ranking(:centro, e.exercise_id) r
  where r.user_id = :sofia), 0::bigint, 'sofía (fuera de rankings) no aparece en Sede Centro');
select ok((select bool_and(r.rank <= 10 or r.is_me) from public.ranking_exercises(:chaca) e,
  public.branch_monthly_ranking(:chaca, e.exercise_id) r), 'el ranking es top 10 más mi fila');
select throws_ok($$ select * from public.ranking_entries('20000000-0000-0000-0000-000000000001', null) $$, '42501', null,
  'la base del ranking no se expone');
select is((select count(*) from public.branch_monthly_ranking('20000000-0000-0000-0000-0000000000ff',
  current_setting('test.ex')::uuid)), 0::bigint, 'no veo rankings de otro gimnasio');

-- ───── Desafíos ─────
select is((select count(*) from public.challenge_progress('40000000-0000-0000-0000-000000000001')), 2::bigint,
  'el desafío muestra sus dos sedes');
select ok((select my_days from public.challenge_progress('40000000-0000-0000-0000-000000000001') where branch_id = :chaca) >= 1,
  'mi check-in suma al desafío');

-- ───── Admin ─────
select is(public.branch_qr_token(:chaca), current_setting('test.tok'), 'el staff obtiene el token del QR');
select is(public.rotate_branch_qr(:chaca), 2, 'el staff rota el QR');
select throws_ok(format($$ select public.perform_checkin('manantial-chacabuco', %L) $$, current_setting('test.tok')),
  '22023', 'qr_invalido', 'después de rotar, el QR viejo deja de servir');
select ok(public.create_challenge('Prueba', null, public.gym_today(), public.gym_today() + 7,
  array[:chaca, :centro]::uuid[]) is not null, 'el staff crea un desafío');

select pg_temp.login(:lucia);
select throws_ok($$ select public.branch_qr_token('20000000-0000-0000-0000-000000000001') $$, '42501', null,
  'quien no es staff no ve el token');
select throws_ok($$ select public.create_challenge('X', null, current_date, current_date, array['20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002']::uuid[]) $$,
  '42501', null, 'quien no es staff no crea desafíos');
select ok(public.claim_gym_admin('codigo-de-prueba'), 'el código correcto se acepta');
select ok(public.is_gym_staff('10000000-0000-0000-0000-000000000001'), 'y quien lo usó queda como admin');
select is(public.claim_gym_admin('codigo-de-prueba'), false, 'el código es de un solo uso');

select * from finish();
rollback;
