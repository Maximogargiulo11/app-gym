/** Solo acepta rutas internas ("/algo"), para que `?next=` no sirva de open redirect. */
export function safeNext(value: unknown, fallback = "/feed") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
