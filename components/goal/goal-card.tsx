"use client";

import { useState, useTransition } from "react";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { paceLabel } from "@/lib/goal";
import { setReadingGoalAction } from "@/server/goals/actions";
import { GOAL_MAX, GOAL_MIN } from "@/types/goal";
import { GoalRing } from "./goal-ring";

const PRESETS = [12, 24, 36, 52];

type Props = {
  year: number;
  /** `null` si aún no hay objetivo este año. `delta` = libros por delante (+) o detrás (−) del ritmo. */
  goal: { target: number; read: number; delta: number } | null;
};

/** Inicio: reto del año. Al tocarla se abre el panel para fijar o cambiar el objetivo. */
export function GoalCard({ year, goal }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const done = goal !== null && goal.read >= goal.target;

  function toggle() {
    if (!open) setValue(goal ? String(goal.target) : "");
    setError(null);
    setOpen(!open);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setReadingGoalAction({ target: value.trim() === "" ? undefined : Number(value) });
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  return (
    <section aria-label={`Reto de lectura de ${year}`} className="px-gutter pb-6">
      <div className={cn("rounded-xl border border-border bg-card", done && "bg-secondary/60")}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-h-11 w-full items-center gap-4 rounded-xl p-4 text-left transition-transform active:scale-[0.99]"
        >
          {goal ? (
            <>
              <GoalRing read={goal.read} target={goal.target} className={done ? "goal-pop" : undefined} />
              <span className="min-w-0 flex-1">
                {done ? <span className="font-display block text-lg font-semibold leading-tight">¡Reto cumplido!</span> : null}
                <span
                  className={cn(
                    "block tabular-nums",
                    done ? "text-sm text-muted-foreground" : "font-display text-lg font-semibold leading-tight",
                  )}
                >
                  {goal.read} de {goal.target} libros
                </span>
                {!done ? <span className="block text-sm text-muted-foreground">{paceLabel(goal.delta)}</span> : null}
              </span>
            </>
          ) : (
            <>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Target className="size-5" aria-hidden />
              </span>
              <span className="font-display min-w-0 flex-1 text-lg leading-snug">
                ¿Cuántos libros quieres leer en {year}?
              </span>
            </>
          )}
        </button>

        {open ? (
          <form onSubmit={save} className="border-t border-border p-4">
            <label htmlFor="goal-target" className="text-sm font-medium">
              Libros que quieres leer en {year}
            </label>
            <input
              id="goal-target"
              type="number"
              inputMode="numeric"
              min={GOAL_MIN}
              max={GOAL_MAX}
              step={1}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={pending}
              autoFocus
              className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setValue(String(preset))}
                  className={cn(
                    "h-11 min-w-11 rounded-full border px-4 text-base tabular-nums transition-transform active:scale-[0.97]",
                    value === String(preset) ? "border-primary bg-primary/10 font-medium" : "border-border bg-background",
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            {error ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggle}
                disabled={pending}
                className="h-11 rounded-full border border-border bg-card text-base font-medium transition-transform active:scale-[0.97]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="h-11 rounded-full bg-primary text-base font-medium text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
