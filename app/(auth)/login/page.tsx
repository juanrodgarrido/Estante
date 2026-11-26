import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <section>
      <div className="text-center">
        <p className="font-display text-5xl font-semibold text-primary" aria-hidden>
          E
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Te estábamos esperando</h1>
        <p className="mt-2 text-muted-foreground">Entra para ver tu estantería.</p>
      </div>
      <div className="mt-8">
        <SignInForm />
      </div>
      <p className="mt-6 text-center text-muted-foreground">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline">
          Créala
        </Link>
      </p>
    </section>
  );
}
