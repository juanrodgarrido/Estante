"use client";

import { ErrorScreen } from "@/components/error-screen";

export default function TabsError({ unstable_retry }: { error: Error; unstable_retry: () => void }) {
  return <ErrorScreen retry={unstable_retry} />;
}
