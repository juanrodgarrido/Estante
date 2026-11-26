import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, resetAuth } from "@/lib/auth";
import { resetMongoClient } from "@/lib/db";
import type { CurrentUser } from "@/types/user";

/** ¿El error, o alguna de sus causas, es "Topology is closed" del driver de MongoDB? */
function isTopologyClosed(error: unknown): boolean {
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    if (current instanceof Error && current.name === "MongoTopologyClosedError") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function readSession(requestHeaders: Headers) {
  try {
    return await getAuth().api.getSession({ headers: requestHeaders });
  } catch (error) {
    if (!isTopologyClosed(error)) throw error;
    // La instancia guardó un cliente de MongoDB ya cerrado: se crea uno nuevo
    // (y con él la instancia de Better Auth que lo usa) y se reintenta una vez.
    console.error("Cliente de MongoDB cerrado: se recrea y se reintenta la sesión", error);
    resetMongoClient();
    resetAuth();
    return await getAuth().api.getSession({ headers: requestHeaders });
  }
}

/** Usuario de la sesión actual o `null`. Una sola lectura por petición. */
export const getOptionalUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession(await headers());
  if (!session) return null;
  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    username: (user as { username?: string | null }).username ?? "",
    email: user.email,
    image: user.image ?? null,
    bio: (user as { bio?: string | null }).bio ?? "",
  };
});

/** Usuario de la sesión actual; sin sesión válida redirige a /login. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}
