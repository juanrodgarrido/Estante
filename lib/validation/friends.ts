import { z } from "zod";

export const targetUserSchema = z.object({
  userId: z.string().regex(/^[a-f0-9]{24}$/, "Identificador de usuario no válido"),
});

export const userSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Escribe al menos 2 caracteres")
    .max(40, "La búsqueda es demasiado larga")
    // Se admite "@usuario": el @ inicial no forma parte de la búsqueda.
    .transform((value) => value.replace(/^@+/, ""))
    .pipe(z.string().min(1, "Escribe al menos 2 caracteres")),
});

/** Cursor de la actividad: `<milisegundos>_<id 24 hex>`. */
export const activityCursorSchema = z
  .string()
  .regex(/^\d{10,15}_[a-f0-9]{24}$/, "Cursor no válido")
  .optional();
