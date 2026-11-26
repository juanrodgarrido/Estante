import { NextResponse } from "next/server";
import { getOptionalUser } from "@/server/auth";
import { countUnread } from "@/server/chat/repository";

export async function GET() {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  try {
    return NextResponse.json({ total: await countUnread(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/chat/unread", error);
    return NextResponse.json({ error: "No hemos podido contar los mensajes." }, { status: 500 });
  }
}
