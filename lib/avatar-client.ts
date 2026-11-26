import { AVATAR_MAX_BYTES, AVATAR_SIZE } from "@/lib/validation/profile";

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Recorta al centro, redimensiona a 256×256 y codifica en WebP (≤ 100 KB).
 * Safari no siempre sabe codificar WebP: en ese caso se usa JPEG.
 */
export async function resizeAvatar(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();

  const probe = await toBlob(canvas, "image/webp", 0.8);
  const type = probe?.type === "image/webp" ? "image/webp" : "image/jpeg";
  for (const quality of [0.85, 0.75, 0.65, 0.5, 0.4, 0.3, 0.2]) {
    const blob = await toBlob(canvas, type, quality);
    if (blob && blob.size <= AVATAR_MAX_BYTES) {
      return new File([blob], type === "image/webp" ? "avatar.webp" : "avatar.jpg", { type });
    }
  }
  throw new Error("size");
}
