"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { changePasswordSchema } from "@/lib/validation/profile";

type Name = "currentPassword" | "newPassword" | "confirmPassword";

export function ChangePasswordForm() {
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors<Name>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = changePasswordSchema.safeParse({
      currentPassword: data.get("currentPassword"),
      newPassword: data.get("newPassword"),
      confirmPassword: data.get("confirmPassword"),
    });
    setFormError(null);
    setSaved(false);
    if (!parsed.success) {
      setErrors(fieldErrors<Name>(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      if (error.status === 429) setFormError("Demasiados intentos. Espera un minuto y vuelve a probar.");
      else if (error.code === "INVALID_PASSWORD") setErrors({ currentPassword: "La contraseña actual no es correcta" });
      else setFormError("No hemos podido cambiar la contraseña. Inténtalo de nuevo.");
      return;
    }
    form.current?.reset();
    setSaved(true);
  }

  return (
    <form ref={form} onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        name="currentPassword"
        type="password"
        label="Contraseña actual"
        autoComplete="current-password"
        error={errors.currentPassword}
        disabled={pending}
      />
      <Field
        name="newPassword"
        type="password"
        label="Contraseña nueva"
        autoComplete="new-password"
        error={errors.newPassword}
        disabled={pending}
      />
      <Field
        name="confirmPassword"
        type="password"
        label="Repite la contraseña nueva"
        autoComplete="new-password"
        error={errors.confirmPassword}
        disabled={pending}
      />
      {formError ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-muted-foreground">
          Contraseña cambiada. Se han cerrado las demás sesiones.
        </p>
      ) : null}
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? "Cambiando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
