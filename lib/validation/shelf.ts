import { z } from "zod";
import { REVIEW_MAX_LENGTH } from "@/types/review";

const bookId = z.string().regex(/^[a-f0-9]{24}$/, "Identificador de libro no válido");

const reviewFields = {
  text: z
    .string()
    .trim()
    .min(1, "Escribe algo en tu reseña")
    .max(REVIEW_MAX_LENGTH, `La reseña no puede superar los ${REVIEW_MAX_LENGTH} caracteres`),
  hasSpoilers: z.boolean(),
};

export const setStatusSchema = z.object({
  bookId,
  status: z.enum(["read", "reading", "want"]),
  rating: z.number().int().min(1).max(5).optional(),
  /** Reseña opcional al marcar como leído. */
  review: z.object(reviewFields).optional(),
  /** Confirma que se pierde la reseña al sacar el libro de Leídos. */
  discardReview: z.boolean().optional(),
});

export const setReviewSchema = z.object({ bookId, ...reviewFields });

export const deleteReviewSchema = z.object({ bookId });

export const setRatingSchema = z.object({
  bookId,
  /** `null` quita la valoración. */
  rating: z.number().int().min(1).max(5).nullable(),
});

export const setProgressSchema = z.object({
  bookId,
  currentPage: z.number().int("Escribe un número entero").min(0, "La página no puede ser negativa").max(100000, "Página demasiado alta"),
});

export const removeSchema = z.object({ bookId, discardReview: z.boolean().optional() });
