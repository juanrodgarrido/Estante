// Zona fija para que el HTML del servidor y el del cliente coincidan (y los días se agrupen igual).
export const CHAT_TIME_ZONE = "Europe/Madrid";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHAT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("es", { timeZone: CHAT_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const weekdayFormat = new Intl.DateTimeFormat("es", { timeZone: CHAT_TIME_ZONE, weekday: "long" });
const shortDateFormat = new Intl.DateTimeFormat("es", { timeZone: CHAT_TIME_ZONE, day: "numeric", month: "short" });
const longDateFormat = new Intl.DateTimeFormat("es", {
  timeZone: CHAT_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const longDateYearFormat = new Intl.DateTimeFormat("es", { timeZone: CHAT_TIME_ZONE, day: "numeric", month: "long", year: "numeric" });

/** `AAAA-MM-DD` del día en la zona del chat. */
export function dayKey(date: Date | string): string {
  return dayKeyFormat.format(new Date(date));
}

/** Días naturales entre dos fechas (en la zona del chat). */
function daysBetween(from: Date | string, to: Date | string): number {
  return Math.round((Date.parse(dayKey(to)) - Date.parse(dayKey(from))) / 86_400_000);
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Hora de un mensaje: «18:05». */
export function messageTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** Hora en la lista: hoy «18:05», «Ayer», el nombre del día esta semana, si no «3 nov». */
export function listTime(iso: string, now: Date = new Date()): string {
  const days = daysBetween(iso, now);
  if (days <= 0) return messageTime(iso);
  if (days === 1) return "Ayer";
  if (days < 7) return capitalize(weekdayFormat.format(new Date(iso)));
  return shortDateFormat.format(new Date(iso));
}

/** Separador de día: «Hoy», «Ayer», «Lunes, 3 de noviembre» o con año si no es el actual. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const days = daysBetween(iso, now);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (dayKey(iso).slice(0, 4) !== dayKey(now).slice(0, 4)) return longDateYearFormat.format(new Date(iso));
  return capitalize(longDateFormat.format(new Date(iso)));
}
