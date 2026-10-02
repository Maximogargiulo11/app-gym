-- Banca · datos de ejemplo para desarrollo local
-- Usuarios de prueba (contraseña de todos: banca1234):
--   demo@banca.app     Maxi G.     pública  · Chacabuco · admin del gimnasio
--   lucia@banca.app    Lucía M.    pública  · Chacabuco
--   tomas@banca.app    Tomás R.    pública  · Chacabuco
--   lucas@banca.app    Lucas P.    pública  · Chacabuco
--   mateo@banca.app    Mateo F.    PRIVADA  · Chacabuco (demo lo sigue, aceptado)
--   nicolas@banca.app  Nicolás B.  pública  · Chacabuco
--   camila@banca.app   Camila A.   PRIVADA  · Chacabuco (demo le mandó solicitud, pendiente)
--   sofia@banca.app    Sofía C.    PRIVADA  · Sede Centro · no aparece en rankings
--   julian@banca.app   Julián D.   pública  · Sede Centro
--   valen@banca.app    Valentina N. pública · Sede Norte
--   bruno@banca.app    Bruno K.    pública  · Chacabuco · bloqueó a demo

-- ───────────────────────── Gimnasio y sedes ─────────────────────────

insert into public.gyms (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Manantial', 'manantial');

insert into public.branches (id, gym_id, name, slug) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Chacabuco', 'manantial-chacabuco'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Sede Centro', 'manantial-centro'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Sede Norte', 'manantial-norte');

-- Secretos fijos solo en desarrollo, para que el QR local sea reproducible.
insert into public.branch_secrets (branch_id, qr_secret) values
  ('20000000-0000-0000-0000-000000000001', 'dev-secret-chacabuco-cambiar-en-produccion'),
  ('20000000-0000-0000-0000-000000000002', 'dev-secret-centro-cambiar-en-produccion'),
  ('20000000-0000-0000-0000-000000000003', 'dev-secret-norte-cambiar-en-produccion');

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

-- ───────────────────────── Usuarios de prueba ─────────────────────────

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('30000000-0000-0000-0000-000000000001'::uuid, 'demo@banca.app',    'Maxi G.',      'maxig',     '20000000-0000-0000-0000-000000000001'::uuid, false, 'tarde',  true),
      ('30000000-0000-0000-0000-000000000002'::uuid, 'lucia@banca.app',   'Lucía M.',     'lucia.m',   '20000000-0000-0000-0000-000000000001'::uuid, false, 'tarde',  true),
      ('30000000-0000-0000-0000-000000000003'::uuid, 'tomas@banca.app',   'Tomás R.',     'tomasr',    '20000000-0000-0000-0000-000000000001'::uuid, false, 'noche',  true),
      ('30000000-0000-0000-0000-000000000004'::uuid, 'lucas@banca.app',   'Lucas P.',     'lucasp',    '20000000-0000-0000-0000-000000000001'::uuid, false, 'mañana', true),
      ('30000000-0000-0000-0000-000000000005'::uuid, 'mateo@banca.app',   'Mateo F.',     'mateof',    '20000000-0000-0000-0000-000000000001'::uuid, true,  'tarde',  true),
      ('30000000-0000-0000-0000-000000000006'::uuid, 'nicolas@banca.app', 'Nicolás B.',   'nico.b',    '20000000-0000-0000-0000-000000000001'::uuid, false, 'noche',  true),
      ('30000000-0000-0000-0000-000000000007'::uuid, 'camila@banca.app',  'Camila A.',    'cami.a',    '20000000-0000-0000-0000-000000000001'::uuid, true,  'mañana', true),
      ('30000000-0000-0000-0000-000000000008'::uuid, 'sofia@banca.app',   'Sofía C.',     'sofic',     '20000000-0000-0000-0000-000000000002'::uuid, true,  'tarde',  false),
      ('30000000-0000-0000-0000-000000000009'::uuid, 'julian@banca.app',  'Julián D.',    'julid',     '20000000-0000-0000-0000-000000000002'::uuid, false, 'noche',  true),
      ('30000000-0000-0000-0000-000000000010'::uuid, 'valen@banca.app',   'Valentina N.', 'valen.n',   '20000000-0000-0000-0000-000000000003'::uuid, false, 'mañana', true),
      ('30000000-0000-0000-0000-000000000011'::uuid, 'bruno@banca.app',   'Bruno K.',     'brunok',    '20000000-0000-0000-0000-000000000001'::uuid, false, 'tarde',  true)
    ) as t(id, email, full_name, username, branch_id, is_private, schedule, in_rankings)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('banca1234', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name),
      now() - interval '60 days', now(), '', '', '', ''
    );

    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id::text, u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );

    -- el trigger handle_new_user ya creó el perfil vacío
    update public.profiles set
      username = u.username,
      branch_id = u.branch_id,
      is_private = u.is_private,
      usual_schedule = u.schedule,
      show_in_rankings = u.in_rankings,
      approve_tags = u.is_private,
      onboarded_at = now() - interval '60 days',
      created_at = now() - interval '60 days'
    where id = u.id;
  end loop;
end $$;

insert into public.gym_staff (gym_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');

-- ───────────────────────── Grafo social ─────────────────────────
-- El trigger fija el estado según la privacidad; para Mateo forzamos "aceptada" después.

insert into public.follows (follower_id, following_id) values
  ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005'),
  ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000004'),
  -- Julián le pidió seguir a demo... demo es pública: queda aceptada
  ('30000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000001');

update public.follows set status = 'accepted'
where follower_id = '30000000-0000-0000-0000-000000000001'
  and following_id = '30000000-0000-0000-0000-000000000005';

-- Bruno bloqueó a demo: demo no debe ver nada de Bruno y viceversa.
insert into public.blocks (blocker_id, blocked_id) values
  ('30000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000001');

-- ───────────────────────── Entrenamientos de ejemplo ─────────────────────────

do $$
declare
  templates jsonb := '{
    "Piernas pesado":   ["Sentadilla con barra", "Prensa 45°", "Peso muerto rumano", "Gemelos de pie"],
    "Empuje · Día A":   ["Press banca con barra", "Press militar con mancuernas", "Elevaciones laterales", "Extensión de tríceps en polea"],
    "Tirón · Día B":    ["Dominadas", "Remo con barra", "Jalón al pecho", "Curl con barra"],
    "Torso":            ["Press banca inclinado con barra", "Remo con mancuerna", "Press Arnold", "Curl martillo"],
    "Glúteos y femoral":["Hip thrust", "Peso muerto rumano", "Camilla de isquiotibiales", "Abductores en máquina"]
  }';
  -- peso base (kg) de cada ejercicio para una persona "promedio"
  base jsonb := '{
    "Sentadilla con barra": 90, "Prensa 45°": 160, "Peso muerto rumano": 80, "Gemelos de pie": 60,
    "Press banca con barra": 65, "Press militar con mancuernas": 18, "Elevaciones laterales": 9,
    "Extensión de tríceps en polea": 25, "Dominadas": 0, "Remo con barra": 60, "Jalón al pecho": 55,
    "Curl con barra": 30, "Press banca inclinado con barra": 55, "Remo con mancuerna": 26,
    "Press Arnold": 16, "Curl martillo": 14, "Hip thrust": 100, "Camilla de isquiotibiales": 40,
    "Abductores en máquina": 50
  }';
  users uuid[] := array[
    '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000011'
  ]::uuid[];
  strength numeric[] := array[1.0, 0.75, 1.15, 1.6, 1.45, 1.4, 1.2, 0.7, 1.1, 0.8, 1.05];
  titles text[];
  uid uuid;
  ui int;
  d int;
  title text;
  started timestamptz;
  wid uuid;
  weid uuid;
  ex_name text;
  ex_pos int;
  set_n int;
  w numeric;
  reps int;
  progress numeric;
  user_branch uuid;
begin
  perform setseed(0.42);
  select array_agg(k) into titles from jsonb_object_keys(templates) k;

  for ui in 1 .. array_length(users, 1) loop
    uid := users[ui];
    select branch_id into user_branch from public.profiles where id = uid;

    -- ~3-4 entrenamientos por semana durante las últimas 5 semanas
    for d in reverse 35 .. 0 loop
      continue when random() > 0.5;
      title := titles[1 + floor(random() * array_length(titles, 1))::int];
      started := date_trunc('day', now() at time zone 'America/Argentina/Cordoba') at time zone 'America/Argentina/Cordoba'
                 - make_interval(days => d)
                 + make_interval(hours => (array[8, 12, 18, 19, 19, 20])[1 + floor(random() * 6)::int],
                                 mins => floor(random() * 50)::int);
      continue when started > now();
      -- progresión lenta: más peso cuanto más reciente
      progress := 1 + (35 - d) * 0.004;

      insert into public.workouts (user_id, branch_id, title, status, started_at, ended_at, is_published)
      values (uid, user_branch, title, 'finished', started,
              started + make_interval(mins => 50 + floor(random() * 30)::int), true)
      returning id into wid;

      ex_pos := 0;
      for ex_name in select jsonb_array_elements_text(templates -> title) loop
        insert into public.workout_exercises (workout_id, exercise_id, position, rest_seconds)
        select wid, e.id, ex_pos, case when ex_pos = 0 then 150 else 90 end
        from public.exercises e where e.name = ex_name and e.created_by is null
        returning id into weid;

        for set_n in 1 .. (3 + floor(random() * 2)::int) loop
          w := round(((base ->> ex_name)::numeric * strength[ui] * progress) / 2.5) * 2.5;
          reps := 6 + floor(random() * 6)::int;
          insert into public.workout_sets (workout_exercise_id, set_number, weight_kg, reps, is_done, completed_at)
          values (weid, set_n, w, reps, true, started + make_interval(mins => ex_pos * 12 + set_n * 3));
        end loop;
        ex_pos := ex_pos + 1;
      end loop;

      update public.workouts set
        total_sets = (select count(*) from public.workout_sets s join public.workout_exercises we on we.id = s.workout_exercise_id where we.workout_id = wid and s.is_done),
        total_volume = (select coalesce(sum(s.weight_kg * s.reps), 0) from public.workout_sets s join public.workout_exercises we on we.id = s.workout_exercise_id where we.workout_id = wid and s.is_done)
      where id = wid;

      -- cada entrenamiento viene con su check-in del día
      insert into public.check_ins (user_id, branch_id, local_date, created_at)
      values (uid, user_branch, (started at time zone 'America/Argentina/Cordoba')::date, started - interval '5 minutes')
      on conflict do nothing;
    end loop;
  end loop;
end $$;

-- Récords personales a partir de los entrenamientos de ejemplo.
insert into public.personal_records (user_id, exercise_id, best_weight, best_weight_reps, best_e1rm, workout_id, achieved_at)
select distinct on (w.user_id, we.exercise_id)
  w.user_id, we.exercise_id, s.weight_kg, s.reps,
  max(round(s.weight_kg * (1 + s.reps / 30.0), 2)) over (partition by w.user_id, we.exercise_id),
  w.id, w.started_at
from public.workout_sets s
join public.workout_exercises we on we.id = s.workout_exercise_id
join public.workouts w on w.id = we.workout_id
where s.is_done and s.weight_kg > 0
order by w.user_id, we.exercise_id, s.weight_kg desc, s.reps desc, w.started_at;

-- ───────────────────────── Comunidad ─────────────────────────

insert into public.partner_posts (user_id, branch_id, topic, days, time_label, body, created_at) values
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Press banca pesado',
   '{martes,jueves}', '19 hs',
   'Press banca pesado martes y jueves a las 19 hs. Busco alguien que me asista en las últimas series.',
   now() - interval '1 hour');

insert into public.likes (workout_id, user_id)
select w.id, f.follower_id
from public.workouts w
join public.follows f on f.following_id = w.user_id and f.status = 'accepted'
where w.started_at > now() - interval '7 days';

insert into public.comments (workout_id, user_id, body)
select w.id, '30000000-0000-0000-0000-000000000001', '¡Bien ahí! Qué buen volumen.'
from public.workouts w
where w.user_id = '30000000-0000-0000-0000-000000000002'
order by w.started_at desc
limit 1;

insert into public.challenges (id, gym_id, title, description, starts_on, ends_on) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Chacabuco vs Sede Centro', 'Días entrenados entre todos los socios',
   date_trunc('month', public.gym_today())::date,
   (date_trunc('month', public.gym_today()) + interval '1 month - 1 day')::date);

insert into public.challenge_branches (challenge_id, branch_id) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
