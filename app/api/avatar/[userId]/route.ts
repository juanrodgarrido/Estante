import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getOptionalUser } from "@/server/auth";
import { getAvatars } from "@/server/profile/repository";

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const user = await getOptionalUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const { userId } = await params;
  if (!ObjectId.isValid(userId) || userId.length !== 24) return new NextResponse(null, { status: 404 });

  const avatar = await (await getAvatars()).findOne({ _id: new ObjectId(userId) });
  if (!avatar) return new NextResponse(null, { status: 404 });

  const etag = `"${avatar.updatedAt.getTime()}"`;
  // La URL lleva `?v=<updatedAt>`: con ella la imagen es inmutable; sin ella, caché corta.
  const cacheControl = request.nextUrl.searchParams.has("v")
    ? "private, max-age=31536000, immutable"
    : "private, max-age=300, stale-while-revalidate=86400";
  const headers = { ETag: etag, "Cache-Control": cacheControl };

  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });

  return new NextResponse(new Uint8Array(avatar.data.buffer), {
    headers: { ...headers, "Content-Type": avatar.contentType, "X-Content-Type-Options": "nosniff" },
  });
}
