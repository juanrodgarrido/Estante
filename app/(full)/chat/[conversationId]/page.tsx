import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Conversación" };

export default function ConversacionPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col pb-safe">
      <ScreenHeader title="Conversación" backHref="/chat" />
      <EmptyState
        icon={MessagesSquare}
        title="Empieza la conversación"
        description="Los mensajes de esta charla aparecerán aquí."
      />
    </main>
  );
}
