import { Suspense } from "react";
import { FriendActivity, FriendActivitySkeleton } from "@/components/activity/friend-activity";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { YearGoal, YearGoalSkeleton } from "@/components/goal/year-goal";
import { ReadingNow, ReadingNowSkeleton } from "@/components/shelf/reading-now";

export default function InicioPage() {
  return (
    <>
      <ScreenHeader eyebrow="Tu rincón de lectura" title="Inicio" />
      <Suspense fallback={<YearGoalSkeleton />}>
        <YearGoal />
      </Suspense>
      <Suspense fallback={<ReadingNowSkeleton />}>
        <ReadingNow />
      </Suspense>
      <Suspense fallback={<FriendActivitySkeleton />}>
        <FriendActivity />
      </Suspense>
    </>
  );
}
