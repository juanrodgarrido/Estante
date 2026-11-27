import type { Metadata } from "next";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";
import { FriendButton } from "@/components/friends/friend-button";
import { UserRow } from "@/components/friends/user-row";
import { UserSearch } from "@/components/friends/user-search";
import { RowsSkeleton } from "@/components/ui/skeletons";
import { getCurrentUser } from "@/server/auth";
import { listFriends, listIncoming, listOutgoing } from "@/server/friends/repository";
import type { UserSummary } from "@/types/friends";

export const metadata: Metadata = { title: "Amistades" };

function Section({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="px-gutter pb-6">
      <h2 id={id} className="font-display mb-1 text-xl font-semibold">
        {title} <span className="tabular-nums text-muted-foreground">{count}</span>
      </h2>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}

function rows(users: UserSummary[], relation: "incoming" | "outgoing" | "friends") {
  return users.map((user) => (
    <UserRow
      key={user.id}
      user={user}
      action={relation === "friends" ? undefined : <FriendButton userId={user.id} relation={relation} compact />}
    />
  ));
}

async function Lists() {
  const me = await getCurrentUser();
  const [incoming, outgoing, friends] = await Promise.all([
    listIncoming(me.id),
    listOutgoing(me.id),
    listFriends(me.id),
  ]);

  if (incoming.length + outgoing.length + friends.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aún no tienes amistades"
        description="Busca a alguien por su @usuario para ver su estantería y chatear sobre libros."
        className="py-8"
      />
    );
  }

  return (
    <>
      {incoming.length > 0 ? (
        <Section id="recibidas" title="Solicitudes recibidas" count={incoming.length}>
          {rows(incoming, "incoming")}
        </Section>
      ) : null}
      {outgoing.length > 0 ? (
        <Section id="enviadas" title="Solicitudes enviadas" count={outgoing.length}>
          {rows(outgoing, "outgoing")}
        </Section>
      ) : null}
      {friends.length > 0 ? (
        <Section id="amigos" title="Amigos" count={friends.length}>
          {rows(friends, "friends")}
        </Section>
      ) : null}
    </>
  );
}

export default function AmigosPage() {
  return (
    <>
      <ScreenHeader title="Amistades" backHref="/perfil" />
      <UserSearch />
      <Suspense fallback={<RowsSkeleton />}>
        <Lists />
      </Suspense>
    </>
  );
}
