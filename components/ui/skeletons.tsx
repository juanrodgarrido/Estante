import { Skeleton } from "@/components/ui/skeleton";

/** Filas con avatar y dos líneas de texto (chat, amigos, resultados de personas). */
export function RowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul aria-hidden className="space-y-3 px-gutter pt-2">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex items-center gap-3 py-2">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <span className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-3.5 w-2/3 rounded" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Cabecera de perfil, estadísticas y cuadrícula de portadas. */
export function ProfileSkeleton() {
  return (
    <div aria-hidden className="px-gutter">
      <div className="flex flex-col items-center gap-3 pt-2">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-6 w-40 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="aspect-[2/3] rounded-cover" />
        ))}
      </div>
    </div>
  );
}

/** Formularios de ajustes: campos apilados con un botón. */
export function FormSkeleton() {
  return (
    <div aria-hidden className="space-y-6 px-gutter">
      <Skeleton className="mx-auto size-24 rounded-full" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-11 rounded-full" />
    </div>
  );
}
