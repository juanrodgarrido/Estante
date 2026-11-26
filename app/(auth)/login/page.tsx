import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <section className="text-center">
      <p className="font-display text-5xl font-semibold text-primary" aria-hidden>
        E
      </p>
      <h1 className="mt-4 text-3xl font-semibold">Te estábamos esperando</h1>
      <p className="mt-2 text-muted-foreground">
        El acceso con tu cuenta llegará en la próxima sesión.
      </p>
      <Link
        href="/registro"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-8")}
      >
        Crear una cuenta
      </Link>
    </section>
  );
}
