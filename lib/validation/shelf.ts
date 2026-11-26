import { z } from "zod";

const bookId = z.string().regex(/^[a-f0-9]{24}$/, "Identificador de libro no válido");

export const setStatusSchema = z.object({
  bookId,
  status: z.enum(["read", "reading", "want"]),
  rating: z.number().int().min(1).max(5).optional(),
});

export const setRatingSchema = z.object({
  bookId,
  /** `null` quita la valoración. */
  rating: z.number().int().min(1).max(5).nullable(),
});

export const setProgressSchema = z.object({
  bookId,
  currentPage: z.number().int("Escribe un número entero").min(0, "La página no puede ser negativa").max(100000, "Página demasiado alta"),
});

export const removeSchema = z.object({ bookId });
