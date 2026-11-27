import type { UserSummary } from "./friends";

export const REVIEW_MAX_LENGTH = 2000;

/** Reseña de texto de un libro leído (serializable). */
export type Review = {
  text: string;
  hasSpoilers: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Opinión de un amigo sobre un libro: nota, reseña o ambas. */
export type FriendReview = {
  user: UserSummary;
  rating?: number;
  review?: { text: string; hasSpoilers: boolean };
  /** Fecha de la última edición de la reseña (o de la nota si no hay reseña). */
  date: string;
};
