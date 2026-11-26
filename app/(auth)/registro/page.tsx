import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <section className="text-center">
      <p className="font-display text-5xl font-semibold text-primary" aria-hidden>
        E
      </p>
      <h1 className="mt-4 text-3xl font-semibold">Crea tu estantería</h1>
      <p className="mt-2 text-muted-foreground">El registro llegará en la próxima sesión.</p>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-8")}
      >
        Ya tengo cuenta
      </Link>
    </section>
  );
}
