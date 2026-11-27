/** User-Agent que Open Library exige: nombre de la app y email de contacto. */
export function openLibraryUserAgent(): string {
  const contact = process.env.OPENLIBRARY_CONTACT_EMAIL?.trim();
  return contact ? `Estante/0.1 (${contact})` : "Estante/0.1";
}
