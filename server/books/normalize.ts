const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  laquo: "«",
  raquo: "»",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Convierte HTML (Google Books) o markdown ligero (Open Library) en texto plano
 * con párrafos separados por línea en blanco. Nunca devuelve etiquetas, así que
 * se puede pintar como texto sin `dangerouslySetInnerHTML`.
 */
export function htmlToText(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  let text = input
    // Open Library separa la descripción de las fuentes con una línea "----"
    .split(/\r?\n-{3,}\r?\n/)[0]
    // Bloques que no son contenido
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    // Cualquier otra etiqueta
    .replace(/<[^>]*>/g, "");
  text = decodeEntities(text)
    // Markdown: [texto](url) → texto, y énfasis
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[\d*\]/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|\s)[*_](\S[^*_]*?)[*_](?=\s|[.,;:!?]|$)/g, "$1$2")
    // Si la entidad decodificada reintrodujo etiquetas, fuera también
    .replace(/<[^>]*>/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return text || undefined;
}

/** Fuerza https y quita parámetros que degradan la portada de Google. */
export function forceHttps(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.replace(/^http:\/\//i, "https://"));
    if (parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/** Año (4 dígitos) de una fecha tipo "1967", "1967-05" o "May 1967". */
export function yearFrom(date: string | undefined | null): string | undefined {
  return date?.match(/\b(1[0-9]{3}|20[0-9]{2})\b/)?.[1];
}

export function pickIsbns(ids: ReadonlyArray<string | undefined | null> | undefined): {
  isbn13?: string;
  isbn10?: string;
} {
  const clean = (ids ?? []).map((id) => id?.replace(/[-\s]/g, "") ?? "");
  return {
    isbn13: clean.find((id) => /^\d{13}$/.test(id)),
    isbn10: clean.find((id) => /^\d{9}[\dXx]$/.test(id)),
  };
}

/** "Fiction / General" → ["Fiction", "General"], sin duplicados ni vacíos. */
export function cleanCategories(raw: ReadonlyArray<string> | undefined, max = 6): string[] | undefined {
  if (!raw?.length) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    for (const part of entry.split("/")) {
      const name = part.trim();
      const key = name.toLowerCase();
      if (name && name.length <= 40 && !seen.has(key)) {
        seen.add(key);
        out.push(name);
      }
    }
  }
  return out.length ? out.slice(0, max) : undefined;
}

/** Códigos de idioma ("es", "spa", "en", "eng") a ISO 639-1 de dos letras. */
export function normalizeLanguage(code: string | undefined | null): string | undefined {
  if (!code) return undefined;
  const map: Record<string, string> = { spa: "es", eng: "en", fre: "fr", fra: "fr", ger: "de", deu: "de", ita: "it", por: "pt", cat: "ca" };
  const lower = code.toLowerCase();
  return lower.length === 2 ? lower : map[lower];
}
