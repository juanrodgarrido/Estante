import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <>
      <ScreenHeader title="Chat" />
      <EmptyState
        icon={MessageCircle}
        title="Sin conversaciones todavía"
        description="Habla de libros con tus amistades. Podrás escribirles cuando acepten tu solicitud."
        action={{ href: "/amigos", label: "Ver amistades" }}
      />
    </>
  );
}
