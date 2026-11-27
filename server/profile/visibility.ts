import "server-only";
import { areFriends, getRelation } from "@/server/friends/repository";
import { getGoalProgress } from "@/server/goals/repository";
import { listShelf } from "@/server/shelf/repository";
import type { GoalProgress } from "@/types/goal";
import type { Relation, UserSummary } from "@/types/friends";
import type { ShelfEntry } from "@/types/shelf";
import type { ProfileStats } from "@/types/user";
import { getBioById, getProfileByUsername, getProfileStats } from "./repository";

export type OtherProfile = {
  profile: UserSummary;
  relation: Relation;
  /** Solo si son amigos aceptados; si no, `null`. */
  private: { bio: string; stats: ProfileStats; goal: GoalProgress | null; shelf: ShelfEntry[] } | null;
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

  const [bio, stats, goal, shelf] = await Promise.all([
    getBioById(profile.id),
    getProfileStats(profile.id),
    getGoalProgress(profile.id),
    listShelf(profile.id),
  ]);
  return { profile, relation, private: { bio, stats, goal, shelf } };
}
