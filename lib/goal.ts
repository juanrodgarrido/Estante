const DAY_MS = 86_400_000;

/** Libros que tocaría llevar hoy para llegar al objetivo a ritmo constante (año natural UTC). */
export function expectedBooks(target: number, now: Date): number {
  const year = now.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const daysInYear = Math.round((Date.UTC(year + 1, 0, 1) - start) / DAY_MS);
  // El día en curso cuenta entero: el 1 de enero ya toca 1/365 del objetivo.
  const dayOfYear = Math.floor((now.getTime() - start) / DAY_MS) + 1;
  return (target * dayOfYear) / daysInYear;
}

/**
 * Diferencia en libros enteros respecto al ritmo esperado: positiva = por delante,
 * negativa = por detrás, 0 = al día (menos de un libro de diferencia).
 */
export function paceDelta(read: number, target: number, now: Date): number {
  return Math.trunc(read - expectedBooks(target, now));
}

export function paceLabel(delta: number): string {
  if (delta === 0) return "Vas al día";
  const books = Math.abs(delta) === 1 ? "1 libro" : `${Math.abs(delta)} libros`;
  return `Vas ${books} por ${delta > 0 ? "delante" : "detrás"}`;
}
