"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Enlace a una conversación; con el panel doble (md+) marca la que está abierta. */
export function ConversationLink({ id, children }: { id: string; children: React.ReactNode }) {
  const href = `/chat/${id}`;
  const current = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="flex min-h-[4.5rem] items-center gap-3 py-3 active:opacity-70 md:-mx-3 md:rounded-xl md:px-3 md:aria-[current=page]:bg-muted"
    >
      {children}
    </Link>
  );
}
