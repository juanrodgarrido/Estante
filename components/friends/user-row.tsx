import Link from "next/link";
import { Avatar } from "@/components/profile/avatar";
import type { UserSummary } from "@/types/friends";

/** Fila de persona: avatar, nombre y @usuario enlazan a su perfil; a la derecha, una acción. */
export function UserRow({ user, action }: { user: UserSummary; action?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Link
        href={`/u/${user.username}`}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 active:opacity-70"
      >
        <Avatar name={user.name} image={user.image} size={44} />
        <span className="min-w-0">
          <span className="block truncate font-medium">{user.name}</span>
          <span className="block truncate text-sm text-muted-foreground">@{user.username}</span>
        </span>
      </Link>
      {action ? <div className="shrink-0">{action}</div> : null}
    </li>
  );
}
