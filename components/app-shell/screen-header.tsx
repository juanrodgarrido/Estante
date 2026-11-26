import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type ScreenHeaderProps = {
  title: string;
  /** Texto pequeño sobre el título. */
  eyebrow?: string;
  /** Si se indica, muestra un botón de volver a esa ruta. */
  backHref?: string;
  /** Acción a la derecha (por ejemplo un botón de iconos). */
  action?: React.ReactNode;
};

export function ScreenHeader({ title, eyebrow, backHref, action }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-background/85 pt-safe backdrop-blur-xl">
      <div className="flex min-h-header items-end justify-between gap-3 px-gutter pb-3 pt-2">
        <div className="flex min-w-0 items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Volver"
              className="-ml-3 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-95"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </Link>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="truncate text-[1.75rem] font-semibold leading-tight tracking-tight">
              {title}
            </h1>
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </div>
    </header>
  );
}
