"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { markInAppNavigation } from "@/lib/in-app-nav";
import { useMediaQuery } from "@/lib/use-media-query";
import { useChannelEvent, userChannel } from "@/lib/pusher-client";
import { TabBarView } from "./tab-bar-view";

type TabBarProps = {
  /** Media query en la que esta barra está visible; fuera de ella no escucha ni consulta nada (por defecto, siempre). */
  media?: string;
  badges?: Partial<Record<string, number>>;
  /** Usuario de la sesión: su canal privado avisa de los cambios de no leídos. */
  userId?: string | null;
  /** Mensajes sin leer calculados en el servidor. */
  unread?: number;
};

/** Total de mensajes sin leer, o `null` si no se ha podido saber (sin red, sesión caducada…). */
async function fetchUnread(): Promise<number | null> {
  try {
    const response = await fetch("/api/chat/unread", { cache: "no-store" });
    if (!response.ok) return null;
    return ((await response.json()) as { total: number }).total;
  } catch {
    return null;
  }
}

export function TabBar({ media, badges, userId: sessionUserId = null, unread = 0 }: TabBarProps) {
  const pathname = usePathname();
  const active = useMediaQuery(media);
  const userId = active ? sessionUserId : null;
  const [count, setCount] = useState(unread);
  const [seenProp, setSeenProp] = useState(unread);
  if (unread !== seenProp) {
    setSeenProp(unread);
    setCount(unread);
  }

  function refresh() {
    void fetchUnread().then((total) => {
      if (total !== null) setCount(total);
    });
  }

  useChannelEvent(userId ? userChannel(userId) : null, "unread-changed", refresh, refresh);

  // Al cambiar de pestaña o volver a la app (también cubre el caso de que Pusher no esté disponible).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!active) return;
    markInAppNavigation();
    if (!userId) return;
    void fetchUnread().then((total) => {
      if (total !== null) setCount(total);
    });
  }, [pathname, userId, active]);

  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void fetchUnread().then((total) => {
        if (total !== null) setCount(total);
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId]);

  return <TabBarView pathname={pathname} badges={{ ...badges, "/chat": count }} />;
}
