import { Suspense } from "react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { ReadingNow, ReadingNowSkeleton } from "@/components/shelf/reading-now";

export default function InicioPage() {
  return (
    <>
      <ScreenHeader eyebrow="Tu rincón de lectura" title="Inicio" />
      <Suspense fallback={<ReadingNowSkeleton />}>
        <ReadingNow />
      </Suspense>
    </>
  );
}
