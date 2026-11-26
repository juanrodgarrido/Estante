"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  removeSchema,
  setProgressSchema,
  setRatingSchema,
  setStatusSchema,
} from "@/lib/validation/shelf";
import { getCurrentUser } from "@/server/auth";
import { getUserBooks, type UserBookDoc } from "./repository";

export type ActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "No se ha podido guardar el cambio. Inténtalo de nuevo.";

function invalid(error: z.ZodError): ActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Datos no válidos" };
}

/** Pasa la estantería a los datos nuevos en Inicio, Perfil y la ficha. */
function refresh() {
  revalidatePath("/", "layout");
}

export async function setShelfStatusAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { bookId, status, rating } = parsed.data;

  try {
    const book = await (await getDb()).collection("books").findOne({ _id: new ObjectId(bookId) }, { projection: { _id: 1 } });
    if (!book) return { ok: false, error: "El libro no existe" };

    const userBooks = await getUserBooks();
    const filter = { userId: new ObjectId(user.id), bookId: book._id };
    const existing = await userBooks.findOne(filter);
    const now = new Date();

    const set: Partial<UserBookDoc> = { status, updatedAt: now };
    const unset: Record<string, 1> = {};

    if (status === "reading") {
      set.startedAt = existing?.status === "reading" ? (existing.startedAt ?? now) : now;
      unset.finishedAt = 1;
      unset.rating = 1;
      if (existing?.status !== "reading") unset.currentPage = 1;
    } else if (status === "read") {
      set.finishedAt = existing?.status === "read" ? (existing.finishedAt ?? now) : now;
      if (rating !== undefined) set.rating = rating;
      else if (existing?.status !== "read") unset.rating = 1;
      unset.currentPage = 1;
    } else {
      unset.startedAt = 1;
      unset.finishedAt = 1;
      unset.rating = 1;
      unset.currentPage = 1;
    }

    // Un campo no puede estar a la vez en $set y $unset.
    for (const key of Object.keys(set)) delete unset[key];

    await userBooks.updateOne(
      filter,
      {
        $set: set,
        $setOnInsert: { createdAt: now },
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      },
      { upsert: true },
    );
  } catch (error) {
    console.error("setShelfStatusAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}

export async function setRatingAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = setRatingSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { bookId, rating } = parsed.data;

  try {
    const result = await (await getUserBooks()).updateOne(
      { userId: new ObjectId(user.id), bookId: new ObjectId(bookId), status: "read" },
      rating === null
        ? { $unset: { rating: 1 }, $set: { updatedAt: new Date() } }
        : { $set: { rating, updatedAt: new Date() } },
    );
    if (result.matchedCount === 0) return { ok: false, error: "Este libro no está en tus leídos" };
  } catch (error) {
    console.error("setRatingAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}

export async function setProgressAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = setProgressSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { bookId, currentPage } = parsed.data;

  try {
    const book = await (await getDb())
      .collection<{ pageCount?: number }>("books")
      .findOne({ _id: new ObjectId(bookId) }, { projection: { pageCount: 1 } });
    if (book?.pageCount && currentPage > book.pageCount) {
      return { ok: false, error: `Este libro tiene ${book.pageCount} páginas` };
    }
    const result = await (await getUserBooks()).updateOne(
      { userId: new ObjectId(user.id), bookId: new ObjectId(bookId), status: "reading" },
      { $set: { currentPage, updatedAt: new Date() } },
    );
    if (result.matchedCount === 0) return { ok: false, error: "Este libro no lo estás leyendo" };
  } catch (error) {
    console.error("setProgressAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}

export async function removeFromShelfAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await (await getUserBooks()).deleteOne({
      userId: new ObjectId(user.id),
      bookId: new ObjectId(parsed.data.bookId),
    });
  } catch (error) {
    console.error("removeFromShelfAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}
