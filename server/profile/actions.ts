"use server";

import { revalidatePath } from "next/cache";
import { Binary, ObjectId } from "mongodb";
import { AVATAR_MAX_BYTES, AVATAR_TYPES, profileSchema } from "@/lib/validation/profile";
import { getCurrentUser } from "@/server/auth";
import { getAvatars, getUsersCollection } from "./repository";

export type ActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "No se ha podido guardar el cambio. Inténtalo de nuevo.";

function refresh() {
  revalidatePath("/", "layout");
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const { name, bio } = parsed.data;

  try {
    await (await getUsersCollection()).updateOne(
      { _id: new ObjectId(user.id) },
      bio ? { $set: { name, bio, updatedAt: new Date() } } : { $set: { name, updatedAt: new Date() }, $unset: { bio: 1 } },
    );
  } catch (error) {
    console.error("updateProfileAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}

/** ¿Los primeros bytes corresponden a un WebP o a un JPEG? */
function sniffType(bytes: Uint8Array): (typeof AVATAR_TYPES)[number] | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export async function updateAvatarAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const file = formData.get("avatar");
  if (!(file instanceof File)) return { ok: false, error: "No se ha recibido ninguna imagen" };
  if (file.size === 0 || file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "La imagen debe pesar como máximo 100 KB" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffType(bytes);
  if (!contentType) return { ok: false, error: "Formato de imagen no válido" };

  const now = new Date();
  try {
    const id = new ObjectId(user.id);
    await (await getAvatars()).updateOne(
      { _id: id },
      { $set: { data: new Binary(bytes), contentType, updatedAt: now } },
      { upsert: true },
    );
    await (await getUsersCollection()).updateOne(
      { _id: id },
      { $set: { image: `/api/avatar/${user.id}?v=${now.getTime()}`, updatedAt: now } },
    );
  } catch (error) {
    console.error("updateAvatarAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}

export async function removeAvatarAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  try {
    const id = new ObjectId(user.id);
    await (await getAvatars()).deleteOne({ _id: id });
    await (await getUsersCollection()).updateOne({ _id: id }, { $set: { image: null, updatedAt: new Date() } });
  } catch (error) {
    console.error("removeAvatarAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}
