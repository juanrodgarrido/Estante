import { Suspense } from "react";
import { NoScrollGutter } from "@/components/app-shell/no-scroll-gutter";
import { TabBarView } from "@/components/app-shell/tab-bar-view";
import { TabBarWithBadges } from "@/components/app-shell/tab-bar-with-badges";
import { CHAT_LIST_PANE, ChatListPane } from "@/components/chat/chat-list-pane";

/** Pantallas grandes (md+): `MD` es la media query con la que estos elementos están visibles. */
const MD = "(min-width: 48rem)";

/**
 * Envuelve las salas de chat (`/chat/[id]`). En móvil la sala ocupa toda la pantalla, como siempre;
 * desde md se ven, ocultas en móvil con `display: none`, la barra lateral y la lista de conversaciones
 * junto a la sala. Persiste al cambiar de conversación. Con `media`, lo oculto no escucha a Pusher.
 */
export default function ChatRoomsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NoScrollGutter />
      <div className="hidden md:block">
        <Suspense fallback={<TabBarView pathname={null} />}>
          <TabBarWithBadges media={MD} />
        </Suspense>
      </div>
      <div className={`hidden flex-col md:flex ${CHAT_LIST_PANE}`}>
        <ChatListPane media={MD} />
      </div>
      <div className="flex flex-1 flex-col md:pl-[calc(var(--rail-w)+var(--chatlist-w))]">{children}</div>
    </>
  );
}
