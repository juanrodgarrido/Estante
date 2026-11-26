import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { BookDetail, BookDetailSkeleton } from "@/components/books/book-detail";

export const metadata: Metadata = { title: "Libro" };

// `params` se lee dentro de <Suspense> (Cache Components).
async function BookContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookDetail id={id} />;
}

export default function LibroPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <ScreenHeader title="Libro" backHref="/buscar" historyBack />
      <Suspense fallback={<BookDetailSkeleton />}>
        <BookContent params={params} />
      </Suspense>
    </>
  );
}
