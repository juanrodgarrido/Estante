import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anillo de progreso del reto. Lleno (con ✓) al cumplirlo, aunque se siga contando. */
export function GoalRing({
  read,
  target,
  size = 64,
  className,
}: {
  read: number;
  target: number;
  size?: number;
  className?: string;
}) {
  const ratio = Math.min(read / target, 1);
  const done = read >= target;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={RADIUS} fill="none" strokeWidth="6" className="stroke-border" />
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {done ? (
          <Check className="size-6 text-primary" strokeWidth={2.5} />
        ) : (
          <span className="font-display text-sm font-semibold tabular-nums">{Math.round(ratio * 100)}%</span>
        )}
      </div>
    </div>
  );
}
