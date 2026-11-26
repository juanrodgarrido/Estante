"use client";

import { useEffect, useEffectEvent } from "react";
import type PusherClient from "pusher-js";

// Mismos nombres que en `server/realtime/pusher.ts`.
export const conversationChannel = (conversationId: string) => `private-conversation-${conversationId}`;
export const userChannel = (userId: string) => `private-user-${userId}`;

let clientPromise: Promise<PusherClient | null> | undefined;
const subscribers = new Map<string, number>();

/** Cliente de Pusher compartido, cargado bajo demanda; `null` si no hay clave (el chat funciona sin tiempo real). */
function getPusherClient(): Promise<PusherClient | null> {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return Promise.resolve(null);
  clientPromise ??= import("pusher-js")
    .then(
      ({ default: Pusher }) =>
        new Pusher(key, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
          channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
        }),
    )
    .catch((error) => {
      console.error("No se ha podido cargar Pusher", error);
      clientPromise = undefined;
      return null;
    });
  return clientPromise;
}

/**
 * Escucha `event` en un canal privado mientras el componente esté montado.
 * Varios componentes pueden escuchar el mismo canal: se desuscribe al irse el último.
 * `onReconnect` se llama al recuperar la conexión, para pedir lo que se haya perdido.
 */
export function useChannelEvent<T>(
  channel: string | null,
  event: string,
  handler: (data: T) => void,
  onReconnect?: () => void,
) {
  const onEvent = useEffectEvent(handler);
  const onConnected = useEffectEvent(() => onReconnect?.());

  useEffect(() => {
    if (!channel) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void getPusherClient().then((pusher) => {
      if (!pusher || cancelled) return;
      const subscription = pusher.channel(channel) ?? pusher.subscribe(channel);
      subscribers.set(channel, (subscribers.get(channel) ?? 0) + 1);
      const listener = (data: T) => onEvent(data);
      subscription.bind(event, listener);

      // Solo cuenta como reconexión si ya estuvo conectado y se perdió la conexión.
      let everConnected = pusher.connection.state === "connected";
      let lost = false;
      const onState = ({ current }: { current: string }) => {
        if (current === "connected") {
          if (lost) onConnected();
          everConnected = true;
          lost = false;
        } else if (everConnected) {
          lost = true;
        }
      };
      pusher.connection.bind("state_change", onState);

      cleanup = () => {
        subscription.unbind(event, listener);
        pusher.connection.unbind("state_change", onState);
        const remaining = (subscribers.get(channel) ?? 1) - 1;
        if (remaining <= 0) {
          subscribers.delete(channel);
          pusher.unsubscribe(channel);
        } else {
          subscribers.set(channel, remaining);
        }
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [channel, event]);
}
