const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** «hace 5 minutos», «ayer», «hace 3 días»… A partir de una semana, la fecha corta. */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs >= 7 * 86_400_000) {
    return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(new Date(iso));
  }
  for (const [unit, ms] of UNITS) {
    if (abs >= ms) return formatter.format(Math.round(diff / ms), unit);
  }
  return "ahora mismo";
}
