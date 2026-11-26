import { getOptionalUser } from "@/server/auth";
import { countPendingIncoming } from "@/server/friends/repository";
import { TabBar } from "./tab-bar";

/** Barra inferior con el número de solicitudes de amistad pendientes sobre la pestaña Perfil. */
export async function TabBarWithBadges() {
  const user = await getOptionalUser();
  const pending = user ? await countPendingIncoming(user.id) : 0;
  return <TabBar badges={{ "/perfil": pending }} />;
}
