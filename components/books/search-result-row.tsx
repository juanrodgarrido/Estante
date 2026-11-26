import Link from "next/link";
import type { BookSearchItem } from "@/types/book";
import { BookCover } from "./book-cover";

export function SearchResultRow({ book }: { book: BookSearchItem }) {
  return (
    <li>
      <Link
        href={`/libro/${book.id}`}
        className="flex min-h-11 items-center gap-4 rounded-xl px-gutter py-3 transition-colors active:bg-muted"
      >
        <BookCover title={book.title} author={book.authors[0]} coverUrl={book.coverUrl} />
        <div className="min-w-0 flex-1">
          <p className="font-display line-clamp-2 text-lg font-semibold leading-snug">{book.title}</p>
          {book.authors.length > 0 ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{book.authors.join(", ")}</p>
          ) : null}
          {book.year ? <p className="mt-0.5 text-sm text-muted-foreground/80">{book.year}</p> : null}
        </div>
      </Link>
    </li>
  );
}

export function SearchResultSkeleton() {
  return (
    <ul aria-hidden className="animate-pulse">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-gutter py-3">
          <div className="aspect-[2/3] w-16 shrink-0 rounded-cover bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-4 w-12 rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
