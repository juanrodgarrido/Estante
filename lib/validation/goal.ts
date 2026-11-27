import { z } from "zod";
import { GOAL_MAX, GOAL_MIN } from "@/types/goal";

export const setGoalSchema = z.object({
  target: z
    .number("Escribe un número")
    .int("Escribe un número entero")
    .min(GOAL_MIN, `El objetivo mínimo es ${GOAL_MIN} libro`)
    .max(GOAL_MAX, `El objetivo máximo es ${GOAL_MAX} libros`),
});
