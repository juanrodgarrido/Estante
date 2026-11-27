import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { getDbSync, getMongoClient } from "@/lib/db";
import { z } from "zod";
import { nameSchema, signUpSchema, usernameSchema } from "@/lib/validation/auth";

const DAY = 60 * 60 * 24;

function createAuth() {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: mongodbAdapter(getDbSync(), { client: getMongoClient() }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    // `bio` solo se escribe desde nuestra Server Action (input: false).
    user: { additionalFields: { bio: { type: "string", required: false, input: false } } },
    // Cookie persistente (Max-Age): sobrevive a cerrar la PWA en iOS.
    session: { expiresIn: 60 * DAY, updateAge: DAY },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-in/username": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    hooks: {
      // Validación en el servidor con los mismos esquemas Zod que el cliente.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/update-user") {
          // Nombre y bio se editan por Server Actions; el avatar, por /api/avatar. Aquí solo se admite el nombre.
          const result = z.object({ name: nameSchema.optional() }).strict().safeParse(ctx.body);
          if (!result.success) throw new APIError("BAD_REQUEST", { message: "Datos no válidos" });
          return;
        }
        if (ctx.path !== "/sign-up/email") return;
        const result = signUpSchema.safeParse(ctx.body);
        if (!result.success) {
          throw new APIError("BAD_REQUEST", { message: result.error.issues[0].message });
        }
        // Sin campos extra (p. ej. `image` con una URL externa).
        if (Object.keys(ctx.body ?? {}).some((key) => !["name", "username", "email", "password", "callbackURL"].includes(key))) {
          throw new APIError("BAD_REQUEST", { message: "Datos no válidos" });
        }
      }),
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 20,
        usernameValidator: (value) => usernameSchema.safeParse(value).success,
      }),
      nextCookies(), // siempre el último
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { _auth?: Auth };

/** Descarta la instancia guardada (se recrea con el siguiente `getAuth()`). */
export function resetAuth(): void {
  globalForAuth._auth = undefined;
}

// Perezoso: el build no necesita variables de entorno.
export function getAuth(): Auth {
  globalForAuth._auth ??= createAuth();
  return globalForAuth._auth;
}
