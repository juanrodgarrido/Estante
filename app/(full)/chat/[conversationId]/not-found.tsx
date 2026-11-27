import { MessageCircleOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function ConversationNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center pt-safe pb-safe">
      <EmptyState
        icon={MessageCircleOff}
        title="Esta conversación no está disponible"
        description="Solo puedes chatear con tus amigos."
        action={{ href: "/chat", label: "Ir a Chat" }}
      />
    </main>
  );
}
