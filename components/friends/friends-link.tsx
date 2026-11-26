import Link from "next/link";
import { Users } from "lucide-react";
import { getOptionalUser } from "@/server/auth";
import { countPendingIncoming } from "@/server/friends/repository";

const iconLink =
  "relative flex size-11 items-center justify-center rounded-full transition-colors hover:bg-muted active:scale-95";

/** Icono de Amistades con el número de solicitudes pendientes. */
export async function FriendsLink() {
  const user = await getOptionalUser();
  const pending = user ? await countPendingIncoming(user.id) : 0;
  return (
    <Link
      href="/amigos"
      aria-label={pending > 0 ? `Amistades, ${pending} ${pending === 1 ? "solicitud pendiente" : "solicitudes pendientes"}` : "Amistades"}
      className={iconLink}
    >
      <Users className="size-5" aria-hidden />
      {pending > 0 ? (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-none tabular-nums text-primary-foreground"
        >
          {pending > 9 ? "9+" : pending}
        </span>
      ) : null}
    </Link>
  );
}

/** Mientras carga el número: el icono solo. */
export function FriendsLinkFallback() {
  return (
    <Link href="/amigos" aria-label="Amistades" className={iconLink}>
      <Users className="size-5" aria-hidden />
    </Link>
  );
}
