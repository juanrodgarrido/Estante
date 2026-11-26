import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Ajustes" };

export default function AjustesPage() {
  return (
    <>
      <ScreenHeader title="Ajustes" backHref="/perfil" />
      <EmptyState
        icon={Settings}
        title="Ajustes de tu cuenta"
        description="Aquí podrás editar tu nombre, tu biografía y tu foto, y cambiar la contraseña."
      />
      <div className="flex justify-center px-gutter pb-8">
        <SignOutButton />
      </div>
    </>
  );
}
