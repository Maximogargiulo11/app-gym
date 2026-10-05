export const SCHEDULES = ["mañana", "tarde", "noche"] as const;
export type Schedule = (typeof SCHEDULES)[number];

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

/** Normaliza lo que la persona tipea: minúsculas, sin tildes ni espacios. */
export function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 20);
}

export function validateUsername(value: string): string | null {
  if (value.length < 3) return "Mínimo 3 caracteres.";
  if (!USERNAME_RE.test(value)) return "Solo letras, números, punto y guion bajo.";
  return null;
}

export function validateFullName(value: string): string | null {
  const v = value.trim();
  if (v.length < 2) return "Escribí tu nombre.";
  if (v.length > 60) return "Máximo 60 caracteres.";
  return null;
}

export type PrivacySettings = {
  is_private: boolean;
  show_branch: boolean;
  show_schedule: boolean;
  show_in_rankings: boolean;
  approve_tags: boolean;
};
