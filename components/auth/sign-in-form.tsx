"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { fieldErrors, signInSchema, type FieldErrors } from "@/lib/validation/auth";

type Name = "identifier" | "password";

export function SignInForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors<Name>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      identifier: String(data.get("identifier") ?? "").replace(/^@/, ""),
      password: data.get("password"),
    });
    setFormError(null);
    if (!parsed.success) {
      setErrors(fieldErrors<Name>(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { identifier, password } = parsed.data;
    const { error } = identifier.includes("@")
      ? await authClient.signIn.email({ email: identifier, password })
      : await authClient.signIn.username({ username: identifier, password });
    if (error) {
      setFormError(translateAuthError(error).message);
      setPending(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        name="identifier"
        label="Email o nombre de usuario"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        error={errors.identifier}
        disabled={pending}
      />
      <Field
        name="password"
        type={showPassword ? "text" : "password"}
        label="Contraseña"
        autoComplete="current-password"
        error={errors.password}
        disabled={pending}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="flex size-11 items-center justify-center text-muted-foreground"
          >
            {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        }
      />
      {formError ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
