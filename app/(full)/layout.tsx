import { Suspense, ViewTransition } from "react";
import { AuthGate } from "@/components/auth/auth-gate";

export default function FullLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>
      <ViewTransition enter="page-fade" exit="page-fade" default="none">
        {children}
      </ViewTransition>
    </>
  );
}
