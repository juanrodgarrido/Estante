import type { Metadata } from "next";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { OpenConversationButton } from "@/components/chat/open-conversation-button";
import { EmptyState } from "@/components/empty-state";
import { UserRow } from "@/components/friends/user-row";
import { getCurrentUser } from "@/server/auth";
import { listFriends } from "@/server/friends/repository";

export const metadata: Metadata = { title: "Nueva conversación" };

async function Friends() {
  const me = await getCurrentUser();
  const friends = await listFriends(me.id);
  if (friends.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aún no tienes amistades"
        description="Solo puedes escribir a tus amistades. Busca a alguien por su @usuario y envíale una solicitud."
        action={{ href: "/amigos", label: "Buscar personas" }}
      />
    );
  }
  return (
    <ul className="divide-y divide-border px-gutter">
      {friends.map((friend) => (
        <UserRow key={friend.id} user={friend} action={<OpenConversationButton userId={friend.id} label="Escribir" compact />} />
      ))}
    </ul>
  );
}

export default function NuevaConversacionPage() {
  return (
    <>
      <ScreenHeader title="Nueva conversación" eyebrow="Tus amistades" backHref="/chat" />
      <Suspense fallback={<div aria-hidden className="mx-gutter h-40 animate-pulse rounded-xl bg-muted" />}>
        <Friends />
      </Suspense>
    </>
  );
}
