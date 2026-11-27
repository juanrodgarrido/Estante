"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  deleteReviewSchema,
  removeSchema,
  setProgressSchema,
  setRatingSchema,
  setReviewSchema,
  setStatusSchema,
} from "@/lib/validation/shelf";
import {
  clearActivity,
  clearRatingActivity,
  clearReviewActivity,
  recordActivity,
  recordReviewActivity,
} from "@/server/activity/repository";
import { getCurrentUser } from "@/server/auth";
import { syncGoalCompletion } from "@/server/goals/repository";
import { getUserBooks, type UserBookDoc } from "./repository";

export type ActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "No se ha podido guardar el cambio. Inténtalo de nuevo.";

const REVIEW_LOSS_ERROR = "Este libro tiene una reseña: confirma que quieres perderla.";

function reviewChanged(
  previous: UserBookDoc["review"],
  next: { text: string; hasSpoilers: boolean },
): boolean {
  return !previous || previous.text !== next.text || previous.hasSpoilers !== next.hasSpoilers;
}

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
  const { bookId, status, rating, review, discardReview } = parsed.data;

  try {
    const book = await (await getDb()).collection("books").findOne({ _id: new ObjectId(bookId) }, { projection: { _id: 1 } });
    if (!book) return { ok: false, error: "El libro no existe" };

    const userBooks = await getUserBooks();
    const filter = { userId: new ObjectId(user.id), bookId: book._id };
    const existing = await userBooks.findOne(filter);
    const now = new Date();

    // La reseña solo vive en «Leídos»: sacar el libro de ahí exige confirmarlo.
    if (existing?.review && status !== "read" && !discardReview) {
      return { ok: false, error: REVIEW_LOSS_ERROR };
    }

    const set: Partial<UserBookDoc> = { status, updatedAt: now };
    const unset: Record<string, 1> = {};
    if (status !== "read") unset.review = 1;
    if (status === "read" && review) {
      set.review = {
        text: review.text,
        hasSpoilers: review.hasSpoilers,
        createdAt: existing?.review?.createdAt ?? now,
        updatedAt: now,
      };
    }

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

    // Actividad para los amigos: solo cuando cambia algo visible.
    if (status === "reading" && existing?.status !== "reading") {
      await recordActivity(user.id, bookId, "started");
    } else if (status === "read" && existing?.status !== "read") {
      await recordActivity(user.id, bookId, "finished", rating);
    } else if (status === "read" && rating !== undefined && rating !== existing?.rating) {
      await recordActivity(user.id, bookId, "rated", rating);
    }
    if (status === "read" && existing?.status !== "read") await syncGoalCompletion(user.id);
    if (status !== "read" && existing?.review) await clearReviewActivity(user.id, bookId);
    if (status === "read" && review && reviewChanged(existing?.review, review)) {
      await recordReviewActivity(user.id, bookId);
    }
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
    if (rating === null) await clearRatingActivity(user.id, bookId);
    else await recordActivity(user.id, bookId, "rated", rating);
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
    const filter = { userId: new ObjectId(user.id), bookId: new ObjectId(parsed.data.bookId) };
    const userBooks = await getUserBooks();
    if (!parsed.data.discardReview && (await userBooks.findOne({ ...filter, review: { $exists: true } }, { projection: { _id: 1 } }))) {
      return { ok: false, error: REVIEW_LOSS_ERROR };
    }
    await userBooks.deleteOne(filter);
    await clearActivity(user.id, parsed.data.bookId);
  } catch (error) {
    console.error("removeFromShelfAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}

/** Guarda (crea o edita) la reseña de un libro que está en Leídos. */
export async function setReviewAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = setReviewSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { bookId, text, hasSpoilers } = parsed.data;

  try {
    const userBooks = await getUserBooks();
    const filter = { userId: new ObjectId(user.id), bookId: new ObjectId(bookId), status: "read" as const };
    const existing = await userBooks.findOne(filter, { projection: { review: 1 } });
    if (!existing) return { ok: false, error: "Solo puedes reseñar libros de tus leídos" };

    const now = new Date();
    // Con pipeline para conservar `createdAt` de forma atómica; `$literal` evita que un
    // texto que empiece por «$» se interprete como una expresión.
    await userBooks.updateOne(filter, [
      {
        $set: {
          review: {
            text: { $literal: text },
            hasSpoilers,
            createdAt: { $ifNull: ["$review.createdAt", now] },
            updatedAt: now,
          },
          updatedAt: now,
        },
      },
    ]);
    if (reviewChanged(existing.review, { text, hasSpoilers })) await recordReviewActivity(user.id, bookId);
  } catch (error) {
    console.error("setReviewAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}

/** Borra la reseña (y su actividad); la nota y el estado no cambian. */
export async function deleteReviewAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = deleteReviewSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await (await getUserBooks()).updateOne(
      { userId: new ObjectId(user.id), bookId: new ObjectId(parsed.data.bookId), status: "read" },
      { $unset: { review: 1 }, $set: { updatedAt: new Date() } },
    );
    await clearReviewActivity(user.id, parsed.data.bookId);
  } catch (error) {
    console.error("deleteReviewAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true };
}
