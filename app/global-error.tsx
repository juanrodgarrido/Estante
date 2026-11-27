"use client";

import { ErrorScreen } from "@/components/error-screen";
import "./globals.css";

export default function GlobalError({ unstable_retry }: { error: Error; unstable_retry: () => void }) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-full flex-col justify-center pt-safe pb-safe">
        <ErrorScreen retry={unstable_retry} />
      </body>
    </html>
  );
}
