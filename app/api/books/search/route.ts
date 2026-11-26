import { NextResponse, type NextRequest } from "next/server";
import { searchQuerySchema } from "@/lib/validation/books";
import { getOptionalUser } from "@/server/auth";
import { searchBooks } from "@/server/books/search";

export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para buscar libros." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const parsed = searchQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    page: searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Búsqueda no válida" },
      { status: 400 },
    );
  }

  try {
    const result = await searchBooks(parsed.data.q, parsed.data.page);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "No hemos podido buscar libros ahora mismo. Inténtalo de nuevo en un momento." },
      { status: 502 },
    );
  }
}
