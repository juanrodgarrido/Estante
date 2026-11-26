import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Perfil de lector" };

export default function UsuarioPage() {
  return (
    <>
      <ScreenHeader title="Perfil" backHref="/amigos" />
      <EmptyState
        icon={UserRound}
        title="Perfil de lector"
        description="Agrega a esta persona como amiga para ver su estantería."
      />
    </>
  );
}
