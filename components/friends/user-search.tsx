"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { UserSearchResult } from "@/types/friends";
import { FriendButton } from "./friend-button";
import { UserRow } from "./user-row";

const DEBOUNCE_MS = 350;
const MIN_LENGTH = 2;

type Outcome = { query: string; items: UserSearchResult[]; error?: string };

/** Buscador de personas por @usuario o nombre. */
export function UserSearch() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim().replace(/^@+/, "")), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (query.length < MIN_LENGTH) return;
    const controller = new AbortController();
    fetch(`/api/users/search?${new URLSearchParams({ q: query })}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          | { items?: UserSearchResult[]; error?: string }
          | null;
        if (!response.ok) throw new Error(body?.error ?? "No hemos podido buscar ahora mismo.");
        setOutcome({ query, items: body?.items ?? [] });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setOutcome({ query, items: [], error: error instanceof Error ? error.message : "Error de red" });
      });
    return () => controller.abort();
  }, [query]);

  const searching = query.length >= MIN_LENGTH;
  const current = outcome?.query === query ? outcome : null;

  return (
    <section aria-label="Buscar personas" className="px-gutter pb-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Busca por @usuario o nombre"
          aria-label="Buscar personas por @usuario o nombre"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 rounded-full pl-12"
        />
      </div>

      {searching ? (
        <div className="mt-3" aria-live="polite">
          {!current ? (
            <p className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Buscando…
            </p>
          ) : current.error ? (
            <p role="alert" className="py-4 text-destructive">
              {current.error}
            </p>
          ) : current.items.length === 0 ? (
            <p className="py-4 text-muted-foreground">No hemos encontrado a nadie con «{query}».</p>
          ) : (
            <ul className="divide-y divide-border">
              {current.items.map((user) => (
                <UserRow key={user.id} user={user} action={<FriendButton userId={user.id} relation={user.relation} compact />} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
