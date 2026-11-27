"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Star, Trophy } from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import { Avatar } from "@/components/profile/avatar";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/relative-time";
import type { ActivityItem, ActivityPage } from "@/types/friends";

function Verb({ item }: { item: ActivityItem }) {
  if (item.type === "started") return <>empezó a leer</>;
  if (item.type === "finished") {
    return (
      <>
        terminó
        {item.rating ? <Rating value={item.rating} /> : null}
      </>
    );
  }
  if (item.type === "reviewed") return <>ha reseñado</>;
  return (
    <>
      valoró
      {item.rating ? <Rating value={item.rating} /> : null}
    </>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-xs text-muted-foreground">
      <Star className="size-3.5 fill-primary text-primary" aria-hidden />
      <span className="sr-only">con </span>
      {value}
    </span>
  );
}

function GoalRow({ item, goal }: { item: ActivityItem; goal: NonNullable<ActivityItem["goal"]> }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/u/${item.user.username}`} aria-label={`Perfil de ${item.user.name}`} className="shrink-0">
        <Avatar name={item.user.name} image={item.user.image} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-pretty leading-snug">
          <Link href={`/u/${item.user.username}`} className="font-semibold">
            {item.user.name}
          </Link>{" "}
          ha cumplido su reto de {goal.target} {goal.target === 1 ? "libro" : "libros"} de {goal.year}
        </p>
        <time dateTime={item.createdAt} suppressHydrationWarning className="text-sm text-muted-foreground">
          {relativeTime(item.createdAt)}
        </time>
      </div>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden>
        <Trophy className="size-5" />
      </span>
    </li>
  );
}

function Row({ item }: { item: ActivityItem }) {
  if (item.type === "goal-completed") return item.goal ? <GoalRow item={item} goal={item.goal} /> : null;
  if (!item.book) return null;
  const book = item.book;
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/u/${item.user.username}`} aria-label={`Perfil de ${item.user.name}`} className="shrink-0">
        <Avatar name={item.user.name} image={item.user.image} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-pretty leading-snug">
          <Link href={`/u/${item.user.username}`} className="font-semibold">
            {item.user.name}
          </Link>{" "}
          <Verb item={item} />{" "}
          <Link href={`/libro/${book.publicId}`} className="font-medium italic">
            {book.title}
          </Link>
        </p>
        {item.excerpt ? (
          <Link
            href={`/libro/${book.publicId}`}
            className="mt-1 line-clamp-2 block text-pretty break-words text-sm leading-snug text-muted-foreground"
          >
            «{item.excerpt}»
          </Link>
        ) : null}
        <time dateTime={item.createdAt} suppressHydrationWarning className="text-sm text-muted-foreground">
          {relativeTime(item.createdAt)}
        </time>
      </div>
      <Link href={`/libro/${book.publicId}`} aria-label={book.title} className="shrink-0 active:opacity-80">
        <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} className="w-11" />
      </Link>
    </li>
  );
}

/** Actividad de amigos: la primera página llega del servidor y «Cargar más» pide las siguientes. */
export function ActivityFeed({ initial }: { initial: ActivityPage }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/activity?${new URLSearchParams({ cursor })}`);
      if (!response.ok) throw new Error();
      const page = (await response.json()) as ActivityPage;
      setItems((current) => [...current, ...page.items.filter((item) => !current.some((c) => c.id === item.id))]);
      setCursor(page.nextCursor);
    } catch {
      setError("No hemos podido cargar más actividad.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>
      {error ? (
        <p role="alert" className="pt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {cursor ? (
        <div className="flex justify-center pt-3">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Cargar más
          </Button>
        </div>
      ) : null}
    </>
  );
}
