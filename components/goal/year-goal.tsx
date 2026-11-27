import { paceDelta } from "@/lib/goal";
import { getCurrentUser } from "@/server/auth";
import { getGoalProgress } from "@/server/goals/repository";
import { GoalCard } from "./goal-card";

/** Inicio: tarjeta del reto anual (o invitación a fijarlo). */
export async function YearGoal() {
  const user = await getCurrentUser();
  const progress = await getGoalProgress(user.id);
  const now = new Date(); // tras la sesión (dinámica): no se congela en el build
  const year = progress?.year ?? now.getUTCFullYear();
  return (
    <GoalCard
      year={year}
      goal={
        progress
          ? { target: progress.target, read: progress.read, delta: paceDelta(progress.read, progress.target, now) }
          : null
      }
    />
  );
}

export function YearGoalSkeleton() {
  return (
    <div aria-hidden className="animate-pulse px-gutter pb-6">
      <div className="h-24 rounded-xl bg-muted" />
    </div>
  );
}
