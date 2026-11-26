import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, "Escribe al menos 2 caracteres").max(200, "Búsqueda demasiado larga"),
  page: z.coerce.number().int().min(0).max(19).default(0),
});

export const bookIdSchema = z
  .string()
  .regex(/^(g-[\w-]{4,40}|ol-OL\d+W|[a-f0-9]{24})$/, "Identificador de libro no válido");
