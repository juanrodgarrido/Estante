import { NextResponse, type NextRequest } from "next/server";
import { pusherAuthSchema } from "@/lib/validation/chat";
import { getOptionalUser } from "@/server/auth";
import { getConversationAccess } from "@/server/chat/repository";
import { getPusher } from "@/server/realtime/pusher";

/**
 * Autoriza la suscripción a un canal privado: `private-user-<id>` solo para esa
 * persona y `private-conversation-<id>` solo para quien participa y sigue siendo amigo.
 */
export async function POST(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }
  const parsed = pusherAuthSchema.safeParse({
    socket_id: form.get("socket_id"),
    channel_name: form.get("channel_name"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  const { socket_id: socketId, channel_name: channel } = parsed.data;

  try {
    const [, kind, id] = /^private-(conversation|user)-([a-f0-9]{24})$/.exec(channel) ?? [];
    const allowed = kind === "user" ? id === user.id : (await getConversationAccess(user.id, id)) !== null;
    if (!allowed) return NextResponse.json({ error: "Sin acceso a este canal" }, { status: 403 });

    const pusher = getPusher();
    if (!pusher) return NextResponse.json({ error: "Tiempo real no disponible" }, { status: 503 });
    return NextResponse.json(pusher.authorizeChannel(socketId, channel));
  } catch (error) {
    console.error("POST /api/pusher/auth", error);
    return NextResponse.json({ error: "No se ha podido autorizar" }, { status: 500 });
  }
}
