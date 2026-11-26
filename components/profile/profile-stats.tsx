import type { ProfileStats } from "@/types/user";

const number = new Intl.NumberFormat("es-ES");

/** Cuatro estadísticas de lectura en una cuadrícula 2×2. */
export function ProfileStatsGrid({ stats }: { stats: ProfileStats }) {
  const items = [
    { label: "Leídos este año", value: number.format(stats.readThisYear) },
    { label: "Leídos en total", value: number.format(stats.readTotal) },
    { label: "Páginas este año", value: number.format(stats.pagesThisYear) },
    {
      label: "Valoración media",
      value: stats.averageRating === null ? "—" : `${stats.averageRating.toFixed(1).replace(".", ",")} ★`,
    },
  ];
  return (
    <dl className="mx-gutter mb-6 grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card px-4 py-3">
          <dd className="font-display text-2xl font-semibold tabular-nums">{item.value}</dd>
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}
