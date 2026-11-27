"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/lib/use-media-query";
import { useChannelEvent, userChannel } from "@/lib/pusher-client";

/**
 * Vuelve a pedir la pantalla al servidor cuando cambian mis conversaciones (mensaje nuevo, leído…).
 * Con `media`, solo actúa mientras se cumple (la lista oculta en móvil junto a la sala no debe escuchar).
 */
export function LiveRefresh({ userId, media }: { userId: string; media?: string }) {
  const router = useRouter();
  const active = useMediaQuery(media);
  useChannelEvent(active ? userChannel(userId) : null, "unread-changed", () => router.refresh(), () => router.refresh());

  // Next oculta la pantalla con <Activity> al salir y la enseña tal cual al volver: si ya se
  // había mostrado antes, se refresca (mientras estaba oculta no escuchaba a Pusher).
  const shownBefore = useRef(false);
  useEffect(() => {
    if (!active) return;
    if (shownBefore.current) router.refresh();
    shownBefore.current = true;
  }, [router, active]);

  return null;
}
