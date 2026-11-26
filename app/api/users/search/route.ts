import { NextResponse, type NextRequest } from "next/server";
import { userSearchSchema } from "@/lib/validation/friends";
import { getOptionalUser } from "@/server/auth";
import { searchUsers } from "@/server/friends/repository";

export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para buscar personas." }, { status: 401 });

  const parsed = userSearchSchema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Búsqueda no válida" }, { status: 400 });
  }

  try {
    return NextResponse.json({ items: await searchUsers(user.id, parsed.data.q) });
  } catch (error) {
    console.error("GET /api/users/search", error);
    return NextResponse.json({ error: "No hemos podido buscar ahora mismo." }, { status: 500 });
  }
}
