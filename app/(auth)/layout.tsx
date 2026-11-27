import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/auth/auth-gate";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-gutter pt-[calc(var(--safe-top)+2.5rem)] pb-[calc(var(--safe-bottom)+2.5rem)]">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      {children}
    </main>
  );
}
