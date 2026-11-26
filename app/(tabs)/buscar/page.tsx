import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { SearchScreen } from "@/components/books/search-screen";
import { SearchResultSkeleton } from "@/components/books/search-result-row";

export const metadata: Metadata = { title: "Buscar" };

export default function BuscarPage() {
  return (
    <>
      <ScreenHeader title="Buscar" />
      {/* useSearchParams exige Suspense con Cache Components */}
      <Suspense fallback={<SearchResultSkeleton />}>
        <SearchScreen />
      </Suspense>
    </>
  );
}
