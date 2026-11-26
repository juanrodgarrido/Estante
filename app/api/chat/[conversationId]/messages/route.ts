import { NextResponse, type NextRequest } from "next/server";
import { conversationIdSchema, messagesCursorSchema } from "@/lib/validation/chat";
import { getOptionalUser } from "@/server/auth";
import { getConversationAccess, listMessages } from "@/server/chat/repository";

/** Mensajes anteriores a `?before=` (o los últimos) de una conversación en la que participo con un amigo. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/chat/[conversationId]/messages">) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const id = conversationIdSchema.safeParse(await params);
  const cursor = messagesCursorSchema.safeParse(request.nextUrl.searchParams.get("before") ?? undefined);
  if (!id.success || !cursor.success) return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });

  try {
    const access = await getConversationAccess(user.id, id.data.conversationId);
    if (!access) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    return NextResponse.json(await listMessages(id.data.conversationId, cursor.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/chat/[conversationId]/messages", error);
    return NextResponse.json({ error: "No hemos podido cargar los mensajes." }, { status: 500 });
  }
}
