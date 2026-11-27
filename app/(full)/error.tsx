"use client";

import { ErrorScreen } from "@/components/error-screen";

export default function FullError({ unstable_retry }: { error: Error; unstable_retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center pt-safe pb-safe">
      <ErrorScreen retry={unstable_retry} />
    </main>
  );
}
