"use client";

import { useFormStatus } from "react-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openConversationAction } from "@/server/chat/actions";

function Submit({ label, compact }: { label: string; compact: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={compact ? "outline" : "default"} size={compact ? "sm" : "default"} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <MessageCircle aria-hidden />}
      {label}
    </Button>
  );
}

/** Abre la conversación con un amigo (la crea si no existe). */
export function OpenConversationButton({
  userId,
  label = "Enviar mensaje",
  compact = false,
}: {
  userId: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <form action={openConversationAction}>
      <input type="hidden" name="userId" value={userId} />
      <Submit label={label} compact={compact} />
    </form>
  );
}
