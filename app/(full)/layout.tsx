import { Suspense } from "react";
import { AuthGate } from "@/components/auth/auth-gate";

export default function FullLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>
      {children}
    </>
  );
}
