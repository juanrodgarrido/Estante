import { GoalRing } from "./goal-ring";
import type { GoalProgress, PastGoal } from "@/types/goal";

/** Progreso del reto anual junto a las estadísticas del perfil (propio o de un amigo). */
export function GoalSummary({ goal }: { goal: GoalProgress }) {
  return (
    <div className="mx-gutter mb-6 flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <GoalRing read={goal.read} target={goal.target} size={52} />
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Reto {goal.year}</p>
        <p className="font-display text-lg font-semibold tabular-nums leading-tight">
          {goal.read} de {goal.target} libros
        </p>
        {goal.completed ? <p className="text-sm text-primary">¡Reto cumplido!</p> : null}
      </div>
    </div>
  );
}

/** «Retos anteriores» en /perfil: un año por fila, con objetivo y lo leído. */
export function PastGoals({ goals }: { goals: PastGoal[] }) {
  if (goals.length === 0) return null;
  return (
    <section aria-labelledby="retos-anteriores" className="px-gutter pt-8 pb-6">
      <h2 id="retos-anteriores" className="font-display mb-1 text-xl font-semibold">
        Retos anteriores
      </h2>
      <ul className="divide-y divide-border">
        {goals.map((goal) => (
          <li key={goal.year} className="flex min-h-11 items-center justify-between gap-3 py-2">
            <span className="tabular-nums">
              {goal.year}: {goal.read} de {goal.target}
            </span>
            {goal.read >= goal.target ? (
              <span className="text-sm text-primary">Cumplido</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
