import { getDb } from "@/lib/db";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return Response.json({ status: "ok", db: "up" }, { headers });
  } catch (error) {
    console.error("Health check: fallo al hacer ping a MongoDB", error);
    return Response.json({ status: "error", db: "down" }, { status: 503, headers });
  }
}
