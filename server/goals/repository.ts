import "server-only";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db";
import { recordGoalCompleted } from "@/server/activity/repository";
import { getUserBooks } from "@/server/shelf/repository";
import type { GoalProgress, PastGoal } from "@/types/goal";

export type ReadingGoalDoc = {
  _id: ObjectId;
  userId: ObjectId;
  year: number;
  target: number;
  createdAt: Date;
  updatedAt: Date;
};

let indexesReady: Promise<unknown> | undefined;

export async function getReadingGoals(): Promise<Collection<ReadingGoalDoc>> {
  const collection = (await getDb()).collection<ReadingGoalDoc>("readingGoals");
  indexesReady ??= collection.createIndex({ userId: 1, year: 1 }, { unique: true }).catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  await indexesReady;
  return collection;
}

/** Año natural en UTC, el mismo criterio que `getProfileStats`. */
export function currentGoalYear(now = new Date()): number {
  return now.getUTCFullYear();
}

/** Libros leídos con `finishedAt` dentro del año (UTC). */
export async function countReadInYear(userId: string, year: number): Promise<number> {
  return (await getUserBooks()).countDocuments({
    userId: new ObjectId(userId),
    status: "read",
    finishedAt: { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) },
  });
}

/** Reto del año en curso con su progreso, o `null` si no hay objetivo. */
export async function getGoalProgress(userId: string): Promise<GoalProgress | null> {
  const year = currentGoalYear();
  const goal = await (await getReadingGoals()).findOne({ userId: new ObjectId(userId), year });
  if (!goal) return null;
  const read = await countReadInYear(userId, year);
  return { year, target: goal.target, read, completed: read >= goal.target };
}

/** Años anteriores con objetivo, del más reciente al más antiguo. */
export async function listPastGoals(userId: string): Promise<PastGoal[]> {
  const year = currentGoalYear();
  const goals = await (await getReadingGoals())
    .find({ userId: new ObjectId(userId), year: { $lt: year } }, { sort: { year: -1 } })
    .toArray();
  if (goals.length === 0) return [];

  const minYear = goals[goals.length - 1].year;
  const rows = await (await getUserBooks())
    .aggregate<{ _id: number; count: number }>([
      {
        $match: {
          userId: new ObjectId(userId),
          status: "read",
          finishedAt: { $gte: new Date(Date.UTC(minYear, 0, 1)), $lt: new Date(Date.UTC(year, 0, 1)) },
        },
      },
      { $group: { _id: { $year: "$finishedAt" }, count: { $sum: 1 } } },
    ])
    .toArray();
  const byYear = new Map(rows.map((row) => [row._id, row.count]));
  return goals.map((goal) => ({ year: goal.year, target: goal.target, read: byYear.get(goal.year) ?? 0 }));
}

/**
 * Registra «reto cumplido» si el progreso del año ya alcanza el objetivo. Nunca lanza
 * (es secundario a la acción que la llama) y es idempotente: una sola vez por año.
 */
export async function syncGoalCompletion(userId: string): Promise<void> {
  try {
    const progress = await getGoalProgress(userId);
    if (progress?.completed) await recordGoalCompleted(userId, progress.year, progress.target);
  } catch (error) {
    console.error("syncGoalCompletion", error);
  }
}
