import { NextResponse, type NextRequest } from "next/server";
import { searchQuerySchema } from "@/lib/validation/books";
import { allowRequest } from "@/lib/rate-limit";
import { getOptionalUser } from "@/server/auth";
import { fillStoredCovers } from "@/server/books/repository";
import { searchBooks } from "@/server/books/search";

export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para buscar libros." }, { status: 401 });
  }

  if (!(await allowRequest(`book-search:${user.id}`, 40, 60))) {
    return NextResponse.json({ error: "Demasiadas búsquedas. Espera un momento." }, { status: 429 });
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
    // Fuera de la caché de la búsqueda: las portadas guardadas pueden haber cambiado desde entonces.
    return NextResponse.json({ ...result, items: await fillStoredCovers(result.items) });
  } catch {
    return NextResponse.json(
      { error: "No hemos podido buscar libros ahora mismo. Inténtalo de nuevo en un momento." },
      { status: 502 },
    );
  }
}
