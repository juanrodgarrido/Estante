import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Library, Settings } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";
import { FriendsLink, FriendsLinkFallback } from "@/components/friends/friends-link";
import { GoalSummary, PastGoals } from "@/components/goal/goal-summary";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStatsGrid } from "@/components/profile/profile-stats";
import { ShelfTabs } from "@/components/shelf/shelf-tabs";
import { ProfileSkeleton } from "@/components/ui/skeletons";
import { getCurrentUser } from "@/server/auth";
import { getGoalProgress, listPastGoals } from "@/server/goals/repository";
import { getProfileStats } from "@/server/profile/repository";
import { listShelf } from "@/server/shelf/repository";
import type { ShelfStatus } from "@/types/shelf";

export const metadata: Metadata = { title: "Perfil" };

const iconLink =
  "flex size-11 items-center justify-center rounded-full transition-colors hover:bg-muted active:scale-95";

const TAB_PARAM: Record<string, ShelfStatus> = { leyendo: "reading", pendientes: "want", leidos: "read" };

async function Profile({ searchParams }: { searchParams: Promise<{ estante?: string | string[] }> }) {
  const user = await getCurrentUser();
  const { estante } = await searchParams;
  const initialTab = (typeof estante === "string" && TAB_PARAM[estante]) || "reading";
  const [entries, stats, goal, pastGoals] = await Promise.all([
    listShelf(user.id),
    getProfileStats(user.id),
    getGoalProgress(user.id),
    listPastGoals(user.id),
  ]);
  return (
    <>
      <ProfileHeader user={user} />
      <ProfileStatsGrid stats={stats} />
      {goal ? <GoalSummary goal={goal} /> : null}
      {entries.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Tu estantería está vacía"
          description="Aquí verás tus libros leídos, los que estás leyendo y los pendientes."
          action={{ href: "/buscar", label: "Añadir mi primer libro" }}
        />
      ) : (
        <ShelfTabs key={initialTab} entries={entries} initialTab={initialTab} />
      )}
      <PastGoals goals={pastGoals} />
    </>
  );
}

export default function PerfilPage({ searchParams }: { searchParams: Promise<{ estante?: string | string[] }> }) {
  return (
    <>
      <ScreenHeader
        title="Perfil"
        action={
          <>
            <Suspense fallback={<FriendsLinkFallback />}>
              <FriendsLink />
            </Suspense>
            <Link href="/ajustes" aria-label="Ajustes" className={iconLink}>
              <Settings className="size-5" aria-hidden />
            </Link>
          </>
        }
      />
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </>
  );
}
