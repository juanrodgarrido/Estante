/** Porcentaje leído (0-100), o `null` si no se conoce el número de páginas. */
export function percentOf(currentPage: number | undefined, pageCount: number | undefined): number | null {
  if (!pageCount) return null;
  return Math.min(100, Math.round(((currentPage ?? 0) / pageCount) * 100));
}
