export type AuthFormError = {
  /** Campo al que pertenece el error, si lo hay. */
  field?: "name" | "username" | "email" | "password" | "identifier";
  message: string;
};

type RawError = { code?: string; status?: number; message?: string } | null | undefined;

export function translateAuthError(error: RawError): AuthFormError {
  if (error?.status === 429) {
    return { message: "Demasiados intentos. Espera un minuto y vuelve a probar." };
  }
  switch (error?.code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return { field: "email", message: "Ya existe una cuenta con ese email" };
    case "USERNAME_IS_ALREADY_TAKEN":
      return { field: "username", message: "Ese nombre de usuario ya está cogido" };
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_USERNAME_OR_PASSWORD":
      return { message: "Email, usuario o contraseña incorrectos" };
    case "USERNAME_TOO_SHORT":
    case "USERNAME_TOO_LONG":
    case "INVALID_USERNAME":
      return {
        field: "username",
        message: "De 3 a 20 caracteres: letras minúsculas, números y guion bajo",
      };
  }
  return { message: "No hemos podido completar la acción. Inténtalo de nuevo." };
}
