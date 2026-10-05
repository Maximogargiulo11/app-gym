-- Banca · catálogo inicial del piloto (datos reales, también en producción)
-- Gimnasio Manantial con sus sedes y la biblioteca global de ejercicios. Los IDs son fijos
-- para que el seed de desarrollo pueda referenciarlos.

-- ───────────────────────── Gimnasio y sedes ─────────────────────────

insert into public.gyms (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Manantial', 'manantial');

insert into public.branches (id, gym_id, name, slug) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Chacabuco', 'manantial-chacabuco'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Sede Centro', 'manantial-centro'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Sede Norte', 'manantial-norte');

-- Cada sede arranca con un secreto de QR aleatorio.
insert into public.branch_secrets (branch_id)
select id from public.branches;

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
