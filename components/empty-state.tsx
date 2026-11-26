import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-sm flex-col items-center px-gutter py-16 text-center",
        className,
      )}
    >
      {/* Lomos de libro apoyados: motivo de la marca para los estados vacíos */}
      <div className="relative mb-7 flex h-24 w-28 items-end justify-center gap-1.5" aria-hidden>
        <span className="h-16 w-4 rounded-t-sm bg-secondary" />
        <span className="h-20 w-5 rounded-t-sm bg-primary/80" />
        <span className="h-14 w-4 rounded-t-sm bg-accent" />
        <span className="h-[4.5rem] w-4 -rotate-6 rounded-t-sm bg-muted-foreground/40 origin-bottom" />
        <span className="absolute inset-x-0 bottom-0 h-px bg-border" />
        <span className="absolute -top-1 right-1 flex size-9 items-center justify-center rounded-full bg-card text-primary shadow-sm ring-1 ring-border">
          <Icon className="size-4" />
        </span>
      </div>
      <h2 className="text-2xl font-semibold leading-snug">{title}</h2>
      <p className="mt-2 text-pretty text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? (
        <Link href={action.href} className={cn(buttonVariants({ size: "lg" }), "mt-7")}>
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
