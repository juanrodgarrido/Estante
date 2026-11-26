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

/** Barra inferior sin estado: `pathname` null = aún no se conoce la ruta. */
export function TabBarView({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl"    >
      <ul
        className="mx-auto grid max-w-xl grid-cols-4 px-2"
        style={{
          paddingBottom: "var(--tabbar-pb)",
          paddingLeft: "max(0.5rem, var(--safe-left))",
          paddingRight: "max(0.5rem, var(--safe-right))",
        }}
      >
        {TABS.map((tab) => {
          const active = isActive(tab, pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[0.6875rem] font-medium tracking-wide transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors group-active:scale-95",
                    active && "bg-accent",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
