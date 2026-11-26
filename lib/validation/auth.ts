import { z } from "zod";

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Escribe tu nombre")
  .max(50, "El nombre admite hasta 50 caracteres");

export const usernameSchema = z
  .string()
  .regex(
    /^[a-z0-9_]{3,20}$/,
    "De 3 a 20 caracteres: letras minúsculas, números y guion bajo",
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Escribe un email válido"));

export const passwordSchema = z
  .string()
  .min(8, "La contraseña necesita al menos 8 caracteres")
  .max(128, "La contraseña admite hasta 128 caracteres");

export const signUpSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "Escribe tu email o nombre de usuario"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

/** Primer mensaje de error de cada campo. */
export function fieldErrors<T extends string>(error: z.ZodError): FieldErrors<T> {
  const out: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as T | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
