import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { listFriendActivity } from "@/server/activity/repository";
import { ActivityFeed } from "./activity-feed";

/** Inicio: «Actividad de amigos». */
export async function FriendActivity() {
  const user = await getCurrentUser();
  const page = await listFriendActivity(user.id);

  return (
    <section aria-labelledby="actividad-amigos" className="px-gutter pb-6">
      <h2 id="actividad-amigos" className="font-display mb-1 text-xl font-semibold">
        Actividad de amigos
      </h2>
      {page.items.length > 0 ? (
        <ActivityFeed initial={page} />
      ) : (
        <div className="mt-2 rounded-xl border border-dashed border-border p-5 text-center">
          <p className="text-base text-muted-foreground">Cuando tus amigos lean algo, lo verás aquí.</p>
          <Link href="/amigos" className={`${buttonVariants({ variant: "secondary" })} mt-3`}>
            Buscar amigos
          </Link>
        </div>
      )}
    </section>
  );
}

export function FriendActivitySkeleton() {
  return (
    <div aria-hidden className="animate-pulse px-gutter pb-6">
      <div className="mb-3 h-6 w-44 rounded bg-muted" />
      {/* Misma forma que una fila de actividad: avatar, dos líneas y portada. */}
      {[0, 1].map((row) => (
        <div key={row} className="flex items-center gap-3 py-3">
          <div className="size-10 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-4/5 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
          <div className="aspect-[2/3] w-11 shrink-0 rounded-cover bg-muted" />
        </div>
      ))}
    </div>
  );
}
