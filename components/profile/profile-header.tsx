import { Avatar } from "@/components/profile/avatar";
import type { ProfileUser } from "@/types/user";

/** Avatar, nombre, @usuario y bio. Lo usan /perfil y /u/[username]. */
export function ProfileHeader({ user }: { user: ProfileUser }) {
  return (
    <section className="flex flex-col items-center px-gutter pb-5 pt-2 text-center">
      <Avatar name={user.name} image={user.image} size={96} />
      <h2 className="mt-3 max-w-full break-words text-2xl font-semibold tracking-tight">{user.name}</h2>
      <p className="text-muted-foreground">@{user.username}</p>
      {user.bio ? <p className="mt-2 max-w-sm whitespace-pre-line break-words text-sm">{user.bio}</p> : null}
    </section>
  );
}
