import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <section>
      <div className="text-center">
        <p className="font-display text-5xl font-semibold text-primary" aria-hidden>
          E
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Crea tu estantería</h1>
        <p className="mt-2 text-muted-foreground">Registra tus lecturas y compártelas con tus amistades.</p>
      </div>
      <div className="mt-8">
        <SignUpForm />
      </div>
      <p className="mt-6 text-center text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline">
          Entra
        </Link>
      </p>
    </section>
  );
}
