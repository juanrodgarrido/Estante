import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import type { CurrentUser } from "@/types/user";

/** Usuario de la sesión actual o `null`. Una sola lectura por petición. */
export const getOptionalUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    username: (user as { username?: string | null }).username ?? "",
    email: user.email,
    image: user.image ?? null,
  };
});

/** Usuario de la sesión actual; sin sesión válida redirige a /login. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}
