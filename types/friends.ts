/** Relación entre el usuario de la sesión y otra persona. */
export type Relation = "none" | "outgoing" | "incoming" | "friends";

/** Lo mínimo que se muestra de una persona en listas (sin bio ni email). */
export type UserSummary = {
  id: string;
  name: string;
  username: string;
  image: string | null;
};

export type UserSearchResult = UserSummary & { relation: Relation };

export type ActivityType = "started" | "finished" | "rated" | "reviewed" | "goal-completed";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  rating?: number;
  /** Solo en «reviewed» y sin spoilers: primeras líneas de la reseña. */
  excerpt?: string;
  /** Solo en «goal-completed»: año y objetivo del reto cumplido (no hay libro). */
  goal?: { year: number; target: number };
  createdAt: string;
  user: UserSummary;
  /** Ausente en «goal-completed». */
  book?: {
    publicId: string;
    title: string;
    author?: string;
    coverUrl?: string;
  };
};

export type ActivityPage = {
  items: ActivityItem[];
  /** Cursor para la página siguiente, o `null` si no hay más. */
  nextCursor: string | null;
};
