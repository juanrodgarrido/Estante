"use client";

import { useRouter } from "next/navigation";
import { useChannelEvent, userChannel } from "@/lib/pusher-client";

/** Vuelve a pedir la pantalla al servidor cuando cambian mis conversaciones (mensaje nuevo, leído…). */
export function LiveRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  useChannelEvent(userChannel(userId), "unread-changed", () => router.refresh(), () => router.refresh());
  return null;
}
