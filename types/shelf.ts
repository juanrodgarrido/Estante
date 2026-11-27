import type { Review } from "./review";

export type ShelfStatus ="read" | "reading" | "want";

export const SHELF_STATUSES: readonly ShelfStatus[] = ["reading", "want", "read"];

export const SHELF_LABELS: Record<ShelfStatus, string> = {
  read: "Leído",
  reading: "Leyendo",
  want: "Pendiente",
};

/** Estado de un libro en la estantería del usuario (serializable). */
export type ShelfState = {
  status: ShelfStatus;
  rating?: number;
  currentPage?: number;
  /** Solo en libros leídos. */
  review?: Review;
};

/** Entrada de estantería con los datos del libro necesarios para pintarla. */
export type ShelfEntry = Omit<ShelfState, "review"> & {
  /** Tiene reseña (el texto no viaja en las listas). */
  hasReview?: boolean;
  /** `_id` del libro en `books`. */
  bookId: string;
  /** Id público para enlazar a `/libro/[id]`. */
  publicId: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  pageCount?: number;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
};
