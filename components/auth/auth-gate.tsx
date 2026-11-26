import { redirect } from "next/navigation";
import { getCurrentUser, getOptionalUser } from "@/server/auth";

/** Valida la sesión en el servidor; sin sesión redirige a /login. Va dentro de <Suspense>. */
export async function AuthGate() {
  await getCurrentUser();
  return null;
}

/** Con sesión, redirige a /. Para /login y /registro. Va dentro de <Suspense>. */
export async function RedirectIfSignedIn() {
  if (await getOptionalUser()) redirect("/");
  return null;
}
