/** Palabras gramaticales del español (artículos, preposiciones, conjunciones…). */
export const SPANISH_STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "y", "e", "o", "en", "con",
  "por", "para", "que", "al", "se", "su", "sus", "mi", "no", "es", "lo", "sobre", "entre", "sin",
  "hacia", "desde", "como",
]);

/** Heurística barata: ñ, tildes, signos ¿¡ o palabras gramaticales del español. */
export function isSpanishQuery(query: string): boolean {
  if (/[ñáéíóúü¿¡]/i.test(query)) return true;
  const words = query.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return words.some((word) => SPANISH_STOPWORDS.has(word));
}
