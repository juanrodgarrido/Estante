export type CurrentUser = {
  /** Id de Better Auth (string). En colecciones propias se guarda como `new ObjectId(user.id)`. */
  id: string;
  name: string;
  username: string;
  email: string;
  image: string | null;
};
