"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { fieldErrors, signUpSchema, type FieldErrors } from "@/lib/validation/auth";

type Name = "name" | "username" | "email" | "password";

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors<Name>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = signUpSchema.safeParse({
      name: data.get("name"),
      username: String(data.get("username") ?? "").trim().toLowerCase(),
      email: data.get("email"),
      password: data.get("password"),
    });
    setFormError(null);
    if (!parsed.success) {
      setErrors(fieldErrors<Name>(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      username: parsed.data.username,
    });
    if (error) {
      const translated = translateAuthError(error);
      if (translated.field && translated.field in parsed.data) {
        setErrors({ [translated.field]: translated.message });
      } else {
        setFormError(translated.message);
      }
      setPending(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        name="name"
        label="Nombre"
        autoComplete="name"
        autoCapitalize="words"
        error={errors.name}
        disabled={pending}
      />
      <Field
        name="username"
        label="Nombre de usuario"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="@usuario"
        error={errors.username}
        disabled={pending}
      />
      <Field
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        error={errors.email}
        disabled={pending}
      />
      <Field
        name="password"
        type={showPassword ? "text" : "password"}
        label="Contraseña"
        autoComplete="new-password"
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
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
