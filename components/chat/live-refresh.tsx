"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChannelEvent, userChannel } from "@/lib/pusher-client";

/** Vuelve a pedir la pantalla al servidor cuando cambian mis conversaciones (mensaje nuevo, leído…). */
export function LiveRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  useChannelEvent(userChannel(userId), "unread-changed", () => router.refresh(), () => router.refresh());

  // Next oculta la pantalla con <Activity> al salir y la enseña tal cual al volver: si ya se
  // había mostrado antes, se refresca (mientras estaba oculta no escuchaba a Pusher).
  const shownBefore = useRef(false);
  useEffect(() => {
    if (shownBefore.current) router.refresh();
    shownBefore.current = true;
  }, [router]);

  return null;
}
