import { NextResponse, type NextRequest } from "next/server";
import { activityCursorSchema } from "@/lib/validation/friends";
import { listFriendActivity } from "@/server/activity/repository";
import { getOptionalUser } from "@/server/auth";

export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para ver la actividad." }, { status: 401 });

  const parsed = activityCursorSchema.safeParse(request.nextUrl.searchParams.get("cursor") ?? undefined);
  if (!parsed.success) return NextResponse.json({ error: "Cursor no válido" }, { status: 400 });

  try {
    return NextResponse.json(await listFriendActivity(user.id, parsed.data));
  } catch (error) {
    console.error("GET /api/activity", error);
    return NextResponse.json({ error: "No hemos podido cargar la actividad." }, { status: 500 });
  }
}
