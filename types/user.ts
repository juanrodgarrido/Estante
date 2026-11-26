export type CurrentUser = {
  /** Id de Better Auth (string). En colecciones propias se guarda como `new ObjectId(user.id)`. */
  id: string;
  name: string;
  username: string;
  email: string;
  /** URL del avatar (`/api/avatar/<id>?v=<ts>`) o `null` si no ha subido ninguno. */
  image: string | null;
  bio: string;
};

/** Lo que se muestra de una persona en su perfil (sin email). */
export type ProfileUser = Pick<CurrentUser, "id" | "name" | "username" | "image" | "bio">;

export type ProfileStats = {
  readThisYear: number;
  readTotal: number;
  pagesThisYear: number;
  /** Media de las valoraciones, o `null` si no hay ninguna. */
  averageRating: number | null;
};
