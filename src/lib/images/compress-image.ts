const MAX_DIMENSION = 1600;
const TARGET_QUALITY = 0.82;
const SKIP_UNDER_BYTES = 220 * 1024;

export async function compressProductImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= SKIP_UNDER_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    if (scale === 1 && file.size <= 1024 * 1024 && file.type !== "image/png") {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const preferWebp = file.type !== "image/jpeg";
    const webp = preferWebp ? await canvasToBlob(canvas, "image/webp", TARGET_QUALITY) : null;
    const jpeg = await canvasToBlob(canvas, "image/jpeg", TARGET_QUALITY);
    const blob =
      webp && webp.size > 0 && (!jpeg || webp.size <= jpeg.size * 1.05) ? webp : jpeg;
    if (!blob || blob.size === 0 || blob.size >= file.size) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") + `.${ext}`;
    return new File([blob], name, { type: blob.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
