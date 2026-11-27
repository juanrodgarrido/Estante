import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChatRoom } from "@/components/chat/chat-room";
import { conversationIdSchema } from "@/lib/validation/chat";
import { getCurrentUser } from "@/server/auth";
import { getConversationAccess, getUserSummary, listMessages } from "@/server/chat/repository";

export const metadata: Metadata = { title: "Conversación" };

// En Android, que el teclado encoja la ventana (en iOS se sigue el viewport visual en `ChatRoom`).
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

async function Room({ params }: { params: Promise<{ conversationId: string }> }) {
  const [raw, me] = await Promise.all([params, getCurrentUser()]);
  const parsed = conversationIdSchema.safeParse(raw);
  if (!parsed.success) notFound();
  const { conversationId } = parsed.data;

  // Sin participación o sin amistad: como si no existiera.
  const access = await getConversationAccess(me.id, conversationId);
  if (!access) notFound();
  const [other, initial] = await Promise.all([getUserSummary(access.otherId), listMessages(conversationId)]);
  if (!other) notFound();

  return <ChatRoom key={conversationId} view={{ id: conversationId, me: me.id, other, initial }} />;
}

function RoomSkeleton() {
  return (
    <div aria-hidden className="fixed inset-0 flex flex-col bg-background pl-[var(--safe-left)] pr-[var(--safe-right)] md:left-[var(--chat-left)] md:pl-0">
      <div className="border-b border-border pt-safe">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-2.5 px-gutter md:max-w-3xl">
          <span className="size-9 animate-pulse rounded-full bg-muted" />
          <span className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex-1" />
      <div className="border-t border-border pb-[max(0.5rem,var(--safe-bottom))] pt-2">
        <div className="mx-auto h-11 max-w-xl px-gutter md:max-w-3xl">
          <div className="h-11 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function ConversacionPage({ params }: { params: Promise<{ conversationId: string }> }) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<RoomSkeleton />}>
        <Room params={params} />
      </Suspense>
    </main>
  );
}
