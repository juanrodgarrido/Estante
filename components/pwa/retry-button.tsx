"use client";

import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    <div className="flex justify-center">
      <Button onClick={() => window.location.reload()}>Reintentar</Button>
    </div>
  );
}
