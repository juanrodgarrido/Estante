import { getOptionalUser } from "@/server/auth";
import { countUnread } from "@/server/chat/repository";
import { countPendingIncoming } from "@/server/friends/repository";
import { TabBar } from "./tab-bar";

/** Barra inferior con los mensajes sin leer (Chat) y las solicitudes de amistad pendientes (Perfil). */
export async function TabBarWithBadges() {
  const user = await getOptionalUser();
  const [pending, unread] = user
    ? await Promise.all([countPendingIncoming(user.id), countUnread(user.id).catch(() => 0)])
    : [0, 0];
  return <TabBar userId={user?.id ?? null} unread={unread} badges={{ "/perfil": pending }} />;
}
