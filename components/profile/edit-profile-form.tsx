"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BIO_MAX, profileSchema } from "@/lib/validation/profile";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { updateProfileAction } from "@/server/profile/actions";

export function EditProfileForm({ name, bio }: { name: string; bio: string }) {
  const [errors, setErrors] = useState<FieldErrors<"name" | "bio">>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [length, setLength] = useState(bio.length);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = profileSchema.safeParse({ name: data.get("name"), bio: data.get("bio") });
    setFormError(null);
    setSaved(false);
    if (!parsed.success) {
      setErrors(fieldErrors<"name" | "bio">(parsed.error));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await updateProfileAction(parsed.data);
      if (result.ok) setSaved(true);
      else setFormError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field name="name" label="Nombre" defaultValue={name} autoComplete="name" error={errors.name} disabled={pending} />
      <div className="space-y-2">
        <Label htmlFor="bio">Biografía</Label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={bio}
          disabled={pending}
          onChange={(event) => setLength(event.target.value.length)}
          aria-invalid={errors.bio ? true : undefined}
          className="min-h-24 w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive"
        />
        <p className={`text-right text-sm ${length > BIO_MAX ? "text-destructive" : "text-muted-foreground"}`}>
          {length}/{BIO_MAX}
        </p>
        {errors.bio ? <p className="text-sm text-destructive">{errors.bio}</p> : null}
      </div>
      {formError ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cambios guardados.
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
