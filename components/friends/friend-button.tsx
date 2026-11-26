"use client";

import { useState, useTransition } from "react";
import { Check, Clock, UserMinus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  acceptFriendRequestAction,
  cancelFriendRequestAction,
  declineFriendRequestAction,
  removeFriendAction,
  sendFriendRequestAction,
  type FriendActionResult,
} from "@/server/friends/actions";
import type { Relation } from "@/types/friends";

type FriendButtonProps = {
  userId: string;
  relation: Relation;
  /** Versión corta para listas (los textos pasan a ser más breves). */
  compact?: boolean;
};

/** Botón de amistad según la relación: añadir, solicitud enviada, aceptar/rechazar o amigos. */
export function FriendButton({ userId, relation, compact = false }: FriendButtonProps) {
  // Estado propio (no `useOptimistic`): en los resultados de búsqueda la prop no se refresca
  // con `revalidatePath`, así que la relación nueva debe conservarse aquí.
  const [current, setCurrent] = useState(relation);
  const [seenProp, setSeenProp] = useState(relation);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // Si el servidor manda otra relación (p. ej. tras revalidar), se adopta.
  if (relation !== seenProp) {
    setSeenProp(relation);
    setCurrent(relation);
  }

  function run(action: (input: unknown) => Promise<FriendActionResult>, next: Relation) {
    const previous = current;
    setError("");
    setConfirmingRemove(false);
    setCurrent(next);
    startTransition(async () => {
      const result = await action({ userId });
      if (result.ok) {
        setCurrent(result.relation);
      } else {
        setCurrent(previous);
        setError(result.error);
      }
    });
  }

  let controls: React.ReactNode;

  if (current === "none") {
    controls = (
      <Button size="sm" disabled={pending} onClick={() => run(sendFriendRequestAction, "outgoing")}>
        <UserPlus aria-hidden />
        {compact ? "Añadir" : "Añadir amigo"}
      </Button>
    );
  } else if (current === "outgoing") {
    controls = compact ? (
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(cancelFriendRequestAction, "none")}>
        Cancelar
      </Button>
    ) : (
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        aria-label="Solicitud enviada. Pulsa para cancelarla"
        onClick={() => run(cancelFriendRequestAction, "none")}
      >
        <Clock aria-hidden />
        Solicitud enviada
      </Button>
    );
  } else if (current === "incoming") {
    controls = (
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(acceptFriendRequestAction, "friends")}>
          <Check aria-hidden />
          {compact ? "Aceptar" : "Aceptar solicitud"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          aria-label="Rechazar solicitud"
          onClick={() => run(declineFriendRequestAction, "none")}
        >
          <X aria-hidden />
          {compact ? null : "Rechazar"}
        </Button>
      </div>
    );
  } else if (compact) {
    controls = (
      <span className="inline-flex h-11 items-center gap-1.5 px-2 text-sm text-muted-foreground">
        <Check className="size-4" aria-hidden />
        Amigos
      </span>
    );
  } else if (confirmingRemove) {
    controls = (
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(removeFriendAction, "none")}>
          <UserMinus aria-hidden />
          Eliminar amistad
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirmingRemove(false)}>
          Cancelar
        </Button>
      </div>
    );
  } else {
    controls = (
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => setConfirmingRemove(true)}>
        <Check aria-hidden />
        Amigos
      </Button>
    );
  }

  return (
    <div className={compact ? "flex flex-col items-end gap-1" : "flex flex-col items-center gap-2"}>
      {controls}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
