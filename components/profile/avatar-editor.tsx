"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/profile/avatar";
import { Button } from "@/components/ui/button";
import { resizeAvatar } from "@/lib/avatar-client";
import { removeAvatarAction, updateAvatarAction } from "@/server/profile/actions";

export function AvatarEditor({ name, image }: { name: string; image: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const resized = await resizeAvatar(file);
        const formData = new FormData();
        formData.set("avatar", resized);
        const result = await updateAvatarAction(formData);
        if (!result.ok) setError(result.error);
      } catch {
        setError("No hemos podido procesar esa imagen. Prueba con otra.");
      }
    });
  }

  function onRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeAvatarAction();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar name={name} image={image} size={96} />
      <input ref={input} type="file" accept="image/*" hidden onChange={onPick} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Camera aria-hidden />}
          {pending ? "Guardando…" : "Cambiar foto"}
        </Button>
        {image ? (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onRemove}>
            <Trash2 aria-hidden />
            Quitar
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
