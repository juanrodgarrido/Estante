"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { setGoalSchema } from "@/lib/validation/goal";
import { getCurrentUser } from "@/server/auth";
import { currentGoalYear, getReadingGoals, syncGoalCompletion } from "./repository";

export type GoalActionResult = { ok: true } | { ok: false; error: string };

/** Fija o cambia el objetivo del año en curso. */
export async function setReadingGoalAction(input: unknown): Promise<GoalActionResult> {
  const user = await getCurrentUser();
  const parsed = setGoalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  try {
    const now = new Date();
    await (await getReadingGoals()).updateOne(
      { userId: new ObjectId(user.id), year: currentGoalYear(now) },
      { $set: { target: parsed.data.target, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    // Bajar el objetivo por debajo de lo ya leído también lo cumple.
    await syncGoalCompletion(user.id);
  } catch (error) {
    console.error("setReadingGoalAction", error);
    return { ok: false, error: "No se ha podido guardar el objetivo. Inténtalo de nuevo." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
