import Link from "next/link";
import { Avatar } from "@/components/profile/avatar";
import { listTime } from "@/lib/chat-time";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/types/chat";

/** Lista de conversaciones: avatar, nombre, extracto, hora y punto de no leído. */
export function ConversationList({ items, me }: { items: ConversationListItem[]; me: string }) {
  return (
    <ul className="divide-y divide-border px-gutter">
      {items.map((item) => {
        const mine = item.lastMessage.senderId === me;
        return (
          <li key={item.id}>
            <Link
              href={`/chat/${item.id}`}
              className="flex min-h-[4.5rem] items-center gap-3 py-3 active:opacity-70"
            >
              <Avatar name={item.other.name} image={item.other.image} size={48} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn("truncate", item.unread ? "font-semibold" : "font-medium")}>
                    {item.other.name}
                  </span>
                  <time
                    dateTime={item.lastMessage.createdAt}
                    suppressHydrationWarning
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      item.unread ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {listTime(item.lastMessage.createdAt)}
                  </time>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "truncate text-sm",
                      item.unread ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {mine ? "Tú: " : ""}
                    {item.lastMessage.text}
                  </span>
                  {item.unread ? (
                    <span role="img" aria-label="Sin leer" className="size-2.5 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
