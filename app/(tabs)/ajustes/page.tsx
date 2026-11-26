import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Ajustes" };

async function Settings() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-8 px-gutter pb-8">
      <AvatarEditor name={user.name} image={user.image} />
      <EditProfileForm name={user.name} bio={user.bio} />
      <section aria-labelledby="password-title" className="space-y-4 border-t border-border pt-6">
        <h2 id="password-title" className="text-xl font-semibold">
          Contraseña
        </h2>
        <ChangePasswordForm />
      </section>
      <div className="flex justify-center border-t border-border pt-6">
        <SignOutButton />
      </div>
    </div>
  );
}

export default function AjustesPage() {
  return (
    <>
      <ScreenHeader title="Ajustes" backHref="/perfil" />
      <Suspense fallback={<div aria-hidden className="mx-gutter h-64 animate-pulse rounded-xl bg-muted" />}>
        <Settings />
      </Suspense>
    </>
  );
}
