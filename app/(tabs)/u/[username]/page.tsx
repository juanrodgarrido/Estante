import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Library, Lock } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { OpenConversationButton } from "@/components/chat/open-conversation-button";
import { EmptyState } from "@/components/empty-state";
import { FriendButton } from "@/components/friends/friend-button";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStatsGrid } from "@/components/profile/profile-stats";
import { ShelfTabs } from "@/components/shelf/shelf-tabs";
import { getCurrentUser } from "@/server/auth";
import { getOtherProfile } from "@/server/profile/visibility";

export const metadata: Metadata = { title: "Perfil de lector" };

async function OtherProfile({ params }: { params: Promise<{ username: string }> }) {
  const [{ username }, me] = await Promise.all([params, getCurrentUser()]);
  const other = await getOtherProfile(me.id, decodeURIComponent(username));
  if (!other) notFound();
  if (other.profile.id === me.id) redirect("/perfil");

  const { profile, relation } = other;
  const priv = other.private;

  return (
    <>
      <ProfileHeader user={{ ...profile, bio: priv?.bio ?? "" }} />
      <div className="flex flex-wrap items-start justify-center gap-2 px-gutter pb-5">
        <FriendButton userId={profile.id} relation={relation} />
        {relation === "friends" ? <OpenConversationButton userId={profile.id} /> : null}
      </div>
      {priv ? (
        <>
          <ProfileStatsGrid stats={priv.stats} />
          {priv.shelf.length === 0 ? (
            <EmptyState
              icon={Library}
              title="Estantería vacía"
              description={`${profile.name} aún no ha añadido ningún libro.`}
              className="py-10"
            />
          ) : (
            <ShelfTabs entries={priv.shelf} ownerName={profile.name} />
          )}
        </>
      ) : (
        <EmptyState
          icon={Lock}
          title="Estantería privada"
          description={
            relation === "incoming"
              ? "Acepta su solicitud para ver su estantería."
              : "Agrega a esta persona como amiga para ver su estantería."
          }
          className="py-10"
        />
      )}
    </>
  );
}

export default function UsuarioPage({ params }: { params: Promise<{ username: string }> }) {
  return (
    <>
      <ScreenHeader title="Perfil" backHref="/amigos" />
      <Suspense fallback={<div aria-hidden className="mx-gutter h-48 animate-pulse rounded-xl bg-muted" />}>
        <OtherProfile params={params} />
      </Suspense>
    </>
  );
}
