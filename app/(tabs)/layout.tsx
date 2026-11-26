import { Suspense } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { TabBar } from "@/components/app-shell/tab-bar";
import { TabBarView } from "@/components/app-shell/tab-bar-view";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col pb-tabbar">{children}</main>
      {/* La ruta activa solo se conoce en la petición: la barra se pinta ya y marca la pestaña después. */}
      <Suspense fallback={<TabBarView pathname={null} />}>
        <TabBar />
      </Suspense>
    </>
  );
}
