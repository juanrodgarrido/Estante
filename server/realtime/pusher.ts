import "server-only";
import Pusher from "pusher";

// Nombres de canal compartidos con el cliente (`lib/pusher-client.ts`).
export const conversationChannel = (conversationId: string) => `private-conversation-${conversationId}`;
export const userChannel = (userId: string) => `private-user-${userId}`;

const globalForPusher = globalThis as unknown as { _pusher?: Pusher | null };

/** Cliente de Pusher del servidor, o `null` si faltan variables (el chat sigue funcionando sin tiempo real). */
export function getPusher(): Pusher | null {
  if (globalForPusher._pusher !== undefined) return globalForPusher._pusher;
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu";
  globalForPusher._pusher = appId && key && secret ? new Pusher({ appId, key, secret, cluster, useTLS: true }) : null;
  return globalForPusher._pusher;
}

/** Publica eventos sin lanzar nunca: si Pusher falla, el dato ya está en MongoDB y llega al recargar. */
export async function publish(events: { channel: string; event: string; data: unknown }[]): Promise<void> {
  const pusher = getPusher();
  if (!pusher || events.length === 0) return;
  try {
    await pusher.triggerBatch(events.map(({ channel, event, data }) => ({ channel, name: event, data })));
  } catch (error) {
    console.error("Pusher: no se han podido publicar los eventos", error);
  }
}
