import { notFound } from "next/navigation";
import { bookIdSchema } from "@/lib/validation/books";
import { getCurrentUser } from "@/server/auth";
import { getBook } from "@/server/books/repository";
import { getShelfState } from "@/server/shelf/repository";
import { ShelfControl } from "@/components/shelf/shelf-control";
import { BookCover } from "./book-cover";
import { BookDescription } from "./book-description";

const LANGUAGES: Record<string, string> = {
  es: "Español", en: "Inglés", fr: "Francés", de: "Alemán", it: "Italiano", pt: "Portugués", ca: "Catalán",
};

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "1967" → "1967"; "2004-05" → "mayo de 2004"; "2004-05-12" → "12 de mayo de 2004". */
function formatDate(raw: string): string {
  const match = raw.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!match) return raw;
  const [, year, month, day] = match;
  const monthName = month ? MONTHS[Number(month) - 1] : undefined;
  if (!monthName) return year;
  return day ? `${Number(day)} de ${monthName} de ${year}` : `${monthName} de ${year}`;
}

export async function BookDetail({ id }: { id: string }) {
  if (!bookIdSchema.safeParse(id).success) notFound();
  const book = await getBook(id);
  if (!book) notFound();
  const user = await getCurrentUser();
  const shelf = await getShelfState(user.id, book._id);

  const details = [
    book.pageCount ? ["Páginas", String(book.pageCount)] : null,
    book.publishedDate ? ["Publicación", formatDate(book.publishedDate)] : null,
    book.language ? ["Idioma", LANGUAGES[book.language] ?? book.language.toUpperCase()] : null,
    book.isbn13 || book.isbn10 ? ["ISBN", (book.isbn13 ?? book.isbn10) as string] : null,
  ].filter((row): row is [string, string] => row !== null);

  return (
    <article className="px-gutter pb-10 pt-2">
      <div className="flex flex-col items-center text-center">
        <BookCover title={book.title} author={book.authors[0]} coverUrl={book.coverUrl} size="lg" />
        <h2 className="font-display mt-6 text-balance text-3xl font-semibold leading-tight">{book.title}</h2>
        {book.subtitle ? <p className="mt-1 text-pretty text-lg text-muted-foreground">{book.subtitle}</p> : null}
        {book.authors.length > 0 ? (
          <p className="mt-2 text-base font-medium">{book.authors.join(", ")}</p>
        ) : null}
      </div>

      <div data-slot="shelf-button" className="my-6">
        <ShelfControl
          bookId={book._id}
          pageCount={book.pageCount}
          initial={shelf}
        />
      </div>

      {book.description ? (
        <section aria-labelledby="sinopsis" className="mt-2">
          <h3 id="sinopsis" className="font-display mb-2 text-xl font-semibold">Sinopsis</h3>
          <BookDescription text={book.description} />
        </section>
      ) : null}

      {book.categories?.length ? (
        <ul aria-label="Categorías" className="mt-6 flex flex-wrap gap-2">
          {book.categories.map((category) => (
            <li key={category} className="rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
              {category}
            </li>
          ))}
        </ul>
      ) : null}

      {details.length > 0 ? (
        <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
          {details.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-right text-base">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function BookDetailSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col items-center px-gutter pt-2">
      <div className="aspect-[2/3] w-48 rounded-cover bg-muted" />
      <div className="mt-6 h-8 w-3/4 rounded bg-muted" />
      <div className="mt-3 h-5 w-1/2 rounded bg-muted" />
      <div className="mt-10 h-24 w-full rounded bg-muted" />
    </div>
  );
}
