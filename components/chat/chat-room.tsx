"use client";

import { Fragment, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ChevronLeft, Loader2 } from "lucide-react";
import { Avatar } from "@/components/profile/avatar";
import { dayKey, dayLabel } from "@/lib/chat-time";
import { mergeMessages, newClientId, type LocalMessage } from "@/lib/chat-messages";
import { conversationChannel, useChannelEvent } from "@/lib/pusher-client";
import { markConversationReadAction, sendMessageAction } from "@/server/chat/actions";
import type { ChatMessage, ConversationView, MessagesPage } from "@/types/chat";
import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";
import { useVisualViewport } from "./use-visual-viewport";

/** Distancia al final (px) por debajo de la cual se sigue pegado a los mensajes nuevos. */
const STICK_THRESHOLD = 120;
/** Mensajes del mismo autor con menos de esto entre ellos se agrupan. */
const JOIN_WINDOW_MS = 5 * 60_000;

async function fetchPage(conversationId: string, before?: string): Promise<MessagesPage> {
  const query = before ? `?${new URLSearchParams({ before })}` : "";
  const response = await fetch(`/api/chat/${conversationId}/messages${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as MessagesPage;
}

function joined(a: LocalMessage | undefined, b: LocalMessage | undefined) {
  return (
    !!a &&
    !!b &&
    a.senderId === b.senderId &&
    dayKey(a.createdAt) === dayKey(b.createdAt) &&
    Math.abs(Date.parse(b.createdAt) - Date.parse(a.createdAt)) < JOIN_WINDOW_MS
  );
}

export function ChatRoom({ view }: { view: ConversationView }) {
  const { id: conversationId, me, other } = view;
  const [messages, setMessages] = useState<LocalMessage[]>(view.initial.messages);
  const [cursor, setCursor] = useState(view.initial.nextCursor);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [unseen, setUnseen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  /** ¿Estaba el usuario al final antes del último cambio? */
  const atBottomRef = useRef(true);
  /** Alto del contenido antes de añadir mensajes antiguos arriba (para no saltar). */
  const prependFromRef = useRef<number | null>(null);
  const lastIdRef = useRef<string | undefined>(undefined);

  function scrollToBottom() {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }

  // Al abrirse el teclado el área visible encoge: si estaba al final, se sigue al final.
  useVisualViewport(rootRef, () => {
    if (atBottomRef.current) scrollToBottom();
  });

  // Tras cada cambio en la lista: conservar la posición al cargar antiguos, o bajar si toca.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const last = messages.at(-1);
    const newAtEnd = last?.id !== lastIdRef.current;
    lastIdRef.current = last?.id;

    if (prependFromRef.current !== null) {
      element.scrollTop += element.scrollHeight - prependFromRef.current;
      prependFromRef.current = null;
    } else if (atBottomRef.current || last?.senderId === me) {
      scrollToBottom();
      atBottomRef.current = true;
    } else if (newAtEnd && last) {
      setUnseen(true);
    }
  }, [messages, me]);

  function markRead() {
    void markConversationReadAction({ conversationId }).catch(() => undefined);
  }

  /** Trae los últimos mensajes (al volver a la app o reconectar), por si se perdió algún evento. */
  function catchUp() {
    void fetchPage(conversationId)
      .then((page) => {
        setMessages((current) => mergeMessages(current, page.messages));
        if (document.visibilityState === "visible") markRead();
      })
      .catch(() => undefined);
  }

  // Leído al abrir; al volver a la app, ponerse al día (cubre también que Pusher no esté disponible).
  const onOpen = useEffectEvent(markRead);
  const onReturn = useEffectEvent(catchUp);
  useEffect(() => {
    onOpen();
    const onVisible = () => {
      if (document.visibilityState === "visible") onReturn();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [conversationId]);

  useChannelEvent<ChatMessage>(
    conversationChannel(conversationId),
    "message",
    (message) => {
      setMessages((current) => mergeMessages(current, [message]));
      if (message.senderId !== me && document.visibilityState === "visible") markRead();
    },
    catchUp,
  );

  // Cargar anteriores al acercarse al principio.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !cursor || olderError) return;

    let active = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || !active) return;
        active = false;
        observer.disconnect();
        setLoadingOlder(true);
        fetchPage(conversationId, cursor)
          .then((page) => {
            prependFromRef.current = root.scrollHeight;
            setMessages((current) => mergeMessages(current, page.messages));
            setCursor(page.nextCursor);
          })
          .catch(() => setOlderError(true))
          .finally(() => setLoadingOlder(false));
      },
      { root, rootMargin: "300px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [conversationId, cursor, olderError]);

  async function deliver(message: LocalMessage) {
    const result = await sendMessageAction({
      conversationId,
      text: message.text,
      clientId: message.clientId,
    }).catch(() => ({ ok: false as const, error: "No se ha enviado" }));

    if (result.ok) {
      setMessages((current) => mergeMessages(current, [result.message]));
    } else {
      setMessages((current) =>
        current.map((item) =>
          item.clientId === message.clientId ? { ...item, status: "failed", error: result.error } : item,
        ),
      );
    }
  }

  function send(text: string) {
    const clientId = newClientId();
    const pending: LocalMessage = {
      id: `local-${clientId}`,
      conversationId,
      senderId: me,
      text,
      createdAt: new Date().toISOString(),
      clientId,
      status: "sending",
    };
    atBottomRef.current = true;
    setMessages((current) => [...current, pending]);
    void deliver(pending);
  }

  function retry(message: LocalMessage) {
    const again: LocalMessage = { ...message, status: "sending", error: undefined };
    setMessages((current) => current.map((item) => (item.clientId === message.clientId ? again : item)));
    void deliver(again);
  }

  return (
    <div
      ref={rootRef}
      data-keyboard="closed"
      className="group/room fixed inset-x-0 top-0 z-40 flex h-dvh flex-col bg-background"
      style={{ paddingLeft: "var(--safe-left)", paddingRight: "var(--safe-right)" }}
    >
      <header className="shrink-0 border-b border-border bg-background/95 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center gap-2 px-gutter">
          <Link
            href="/chat"
            aria-label="Volver a las conversaciones"
            className="-ml-3 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
          <Link href={`/u/${other.username}`} className="flex min-h-11 min-w-0 items-center gap-2.5 active:opacity-70">
            <Avatar name={other.name} image={other.image} size={36} />
            <span className="min-w-0">
              <span className="block truncate font-semibold leading-tight">{other.name}</span>
              <span className="block truncate text-xs text-muted-foreground">@{other.username}</span>
            </span>
          </Link>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < STICK_THRESHOLD;
          atBottomRef.current = atBottom;
          if (atBottom) setUnseen(false);
        }}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-end px-gutter pb-3">
          <div ref={sentinelRef} aria-hidden className="h-px" />
          {loadingOlder ? (
            <div className="flex justify-center py-3 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-label="Cargando mensajes anteriores" />
            </div>
          ) : null}
          {olderError ? (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={() => setOlderError(false)}
                className="min-h-11 px-3 text-sm text-destructive active:opacity-70"
              >
                No se han podido cargar los anteriores · Reintentar
              </button>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <p className="py-10 text-center text-pretty text-muted-foreground">
              Aún no hay mensajes. Escribe a {other.name} sobre lo que estás leyendo.
            </p>
          ) : (
            <ol aria-label={`Mensajes con ${other.name}`} className="flex flex-col">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const next = messages[index + 1];
                const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
                return (
                  <Fragment key={message.clientId}>
                    {newDay ? (
                      <li className="sticky top-2 z-10 mt-4 mb-1 flex justify-center first:mt-2">
                        <span
                          suppressHydrationWarning
                          className="rounded-full bg-muted/90 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
                        >
                          {dayLabel(message.createdAt)}
                        </span>
                      </li>
                    ) : null}
                    <MessageBubble
                      message={message}
                      mine={message.senderId === me}
                      joinedAbove={!newDay && joined(previous, message)}
                      joinedBelow={joined(message, next)}
                      onRetry={retry}
                    />
                  </Fragment>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <div className="relative shrink-0 border-t border-border bg-background/95 backdrop-blur-xl">
        {unseen ? (
          <button
            type="button"
            onClick={() => {
              scrollToBottom();
              setUnseen(false);
            }}
            className="absolute -top-14 left-1/2 flex h-11 -translate-x-1/2 items-center gap-1.5 rounded-full bg-card px-4 text-sm font-medium shadow-md ring-1 ring-border active:scale-95"
          >
            <ArrowDown className="size-4" aria-hidden />
            Mensajes nuevos
          </button>
        ) : null}
        <div className="mx-auto w-full max-w-xl px-gutter pt-2 pb-[max(0.5rem,var(--safe-bottom))] group-data-[keyboard=open]/room:pb-2">
          <Composer
            onSend={send}
            onFocus={() => {
              // iOS anima el teclado: se baja al final cuando termina de abrirse.
              if (atBottomRef.current) setTimeout(scrollToBottom, 300);
            }}
          />
        </div>
      </div>
    </div>
  );
}
