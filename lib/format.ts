const nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/** 8420 → "8.420", 72.5 → "72,5" */
export function formatNumber(n: number) {
  return nf.format(n);
}

export function formatKg(n: number) {
  return `${formatNumber(n)} kg`;
}

/** Acepta "72,5" o "72.5". Devuelve null si está vacío o no es un número. */
export function parseDecimal(value: string): number | null {
  const v = value.trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseIntOrNull(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/** Cronómetro: 42:18 o 1:05:09 */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Duración legible: "1h 12m" o "42m" */
export function formatDuration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "2:00", "1:30" para descansos */
export function formatRest(seconds: number) {
  return seconds <= 0 ? "Sin descanso" : formatClock(seconds * 1000);
}

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "America/Argentina/Cordoba",
});

export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

/** Para buscar sin tildes ni mayúsculas. */
export function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** 1RM estimado (Epley). */
export function epley(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

/** "hace 25 min", "hace 3 h", "hace 2 d" o la fecha si es más viejo. */
export function timeAgo(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return formatDate(iso);
}
