import "server-only";
import { areFriends, getRelation } from "@/server/friends/repository";
import { listShelf } from "@/server/shelf/repository";
import type { Relation, UserSummary } from "@/types/friends";
import type { ShelfEntry } from "@/types/shelf";
import type { ProfileStats } from "@/types/user";
import { getBioById, getProfileByUsername, getProfileStats } from "./repository";

export type OtherProfile = {
  profile: UserSummary;
  relation: Relation;
  /** Solo si son amigos aceptados; si no, `null`. */
  private: { bio: string; stats: ProfileStats; shelf: ShelfEntry[] } | null;
};

/**
 * Único camino a los datos de otra persona. Los no amigos solo reciben nombre,
 * @usuario y avatar; bio, estadísticas y estantería exigen `areFriends`.
 */
export async function getOtherProfile(viewerId: string, username: string): Promise<OtherProfile | null> {
  const profile = await getProfileByUsername(username);
  if (!profile) return null;

  const [relation, friends] = await Promise.all([
    getRelation(viewerId, profile.id),
    areFriends(viewerId, profile.id),
  ]);
  if (!friends) return { profile, relation, private: null };

  const [bio, stats, shelf] = await Promise.all([
    getBioById(profile.id),
    getProfileStats(profile.id),
    listShelf(profile.id),
  ]);
  return { profile, relation, private: { bio, stats, shelf } };
}
