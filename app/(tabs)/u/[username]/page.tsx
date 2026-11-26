import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Lock } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";
import { ProfileHeader } from "@/components/profile/profile-header";
import { getCurrentUser } from "@/server/auth";
import { getProfileByUsername } from "@/server/profile/repository";

export const metadata: Metadata = { title: "Perfil de lector" };

async function OtherProfile({ params }: { params: Promise<{ username: string }> }) {
  const [{ username }, me] = await Promise.all([params, getCurrentUser()]);
  const profile = await getProfileByUsername(decodeURIComponent(username));
  if (!profile) notFound();
  if (profile.id === me.id) redirect("/perfil");

  // Sesión 7: con amistad aceptada aquí irán bio, estadísticas y estantería.
  return (
    <>
      <ProfileHeader user={{ ...profile, bio: "" }} />
      <EmptyState
        icon={Lock}
        title="Estantería privada"
        description="Agrega a esta persona como amiga para ver su estantería."
      />
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
