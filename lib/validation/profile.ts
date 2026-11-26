import { z } from "zod";
import { nameSchema, passwordSchema } from "@/lib/validation/auth";

export const BIO_MAX = 160;
export const AVATAR_SIZE = 256;
export const AVATAR_MAX_BYTES = 100 * 1024;
export const AVATAR_TYPES = ["image/webp", "image/jpeg"] as const;

export const profileSchema = z.object({
  name: nameSchema,
  bio: z.string().trim().max(BIO_MAX, `La biografía admite hasta ${BIO_MAX} caracteres`),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "La nueva contraseña debe ser distinta de la actual",
  });
