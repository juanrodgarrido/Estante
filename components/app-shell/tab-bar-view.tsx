import Link from "next/link";
import { BookOpen, MessageCircle, Search, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Prefijos de ruta que también activan la pestaña. */
  match: string[];
};

const TABS: Tab[] = [
  { href: "/", label: "Inicio", icon: BookOpen, match: [] },
  { href: "/buscar", label: "Buscar", icon: Search, match: ["/buscar", "/libro"] },
  { href: "/chat", label: "Chat", icon: MessageCircle, match: ["/chat"] },
  { href: "/perfil", label: "Perfil", icon: User, match: ["/perfil", "/ajustes", "/amigos", "/u"] },
];

function isActive(tab: Tab, pathname: string | null) {
  if (pathname === null) return false;
  if (tab.href === "/") return pathname === "/";
  return tab.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Misma caja que el contenido de cada pestaña, para que la píldora caiga justo detrás del icono.
const CELL = "flex h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium tracking-wide";

/** Barra inferior sin estado: `pathname` null = aún no se conoce la ruta. */
export function TabBarView({
  pathname,
  badges = {},
}: {
  pathname: string | null;
  /** Número a mostrar sobre el icono de cada pestaña (por `href`); 0 u omitido = sin badge. */
  badges?: Partial<Record<string, number>>;
}) {
  const activeIndex = TABS.findIndex((tab) => isActive(tab, pathname));

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl"
    >
      <div
        className="relative mx-auto max-w-xl"
        style={{
          paddingBottom: "var(--tabbar-pb)",
          paddingLeft: "max(0.5rem, var(--safe-left))",
          paddingRight: "max(0.5rem, var(--safe-right))",
        }}
      >
        {/* Píldora de la pestaña activa: una sola, que se desliza entre pestañas al navegar. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 grid grid-cols-4"
          style={{
            left: "max(0.5rem, var(--safe-left))",
            right: "max(0.5rem, var(--safe-right))",
          }}
        >
          <div
            className={cn(
              CELL,
              "transition-[translate,opacity] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
              activeIndex < 0 && "opacity-0",
            )}
            style={{ translate: `${Math.max(activeIndex, 0) * 100}% 0` }}
          >
            <span className="h-7 w-12 rounded-full bg-accent" />
            <span className="invisible">·</span>
          </div>
        </div>

        <ul className="relative grid grid-cols-4">
          {TABS.map((tab) => {
            const active = isActive(tab, pathname);
            const Icon = tab.icon;
            const badge = badges[tab.href] ?? 0;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    CELL,
                    "group rounded-2xl transition-colors duration-300",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="relative flex h-7 w-12 items-center justify-center transition-transform group-active:scale-90">
                    <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                    {badge > 0 ? (
                      <span
                        role="img"
                        aria-label={`${badge} ${badge === 1 ? "solicitud pendiente" : "solicitudes pendientes"}`}
                        className="absolute right-1.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-none tabular-nums text-primary-foreground"
                      >
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
