export type CatalogExercise = {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment: string | null;
  created_by: string | null;
};

/** Valores como texto para poder tipear "72,5" sin pelearse con el input. */
export type DraftSet = {
  id: string;
  weight: string;
  reps: string;
  done: boolean;
  completedAt: string | null;
};

export type DraftExercise = {
  id: string;
  exerciseId: string;
  name: string;
  muscles: string[];
  restSeconds: number;
  sets: DraftSet[];
};

export type ActiveWorkout = {
  workoutId: string;
  title: string;
  startedAt: string;
  exercises: DraftExercise[];
  /** Descanso en curso (timestamps en ms, sobreviven a recargar la app). */
  rest: { endsAt: number; total: number } | null;
};

export type PreviousSet = { set_number: number; weight_kg: number | null; reps: number | null };

export type Record = { best_weight: number; best_weight_reps: number; best_e1rm: number };

export const REST_OPTIONS = [0, 45, 60, 90, 120, 150, 180, 240, 300];

export const MUSCLE_FILTERS: { label: string; groups: string[] }[] = [
  { label: "Pecho", groups: ["Pecho"] },
  { label: "Espalda", groups: ["Espalda", "Trapecio"] },
  { label: "Hombro", groups: ["Hombro"] },
  { label: "Bíceps", groups: ["Bíceps", "Antebrazo"] },
  { label: "Tríceps", groups: ["Tríceps"] },
  { label: "Piernas", groups: ["Cuádriceps", "Isquiotibiales", "Glúteos", "Gemelos", "Aductores"] },
  { label: "Core", groups: ["Core"] },
  { label: "Cardio", groups: ["Cardio"] },
];
