/**
 * Shrink a photo in the browser before it is uploaded.
 *
 * Two reasons, and the second is the one that matters. A phone camera produces
 * 4–12MB per shot, which is more than a server action will accept and more than
 * a roofer standing in a driveway on one bar wants to push. And the picture
 * ends up in a quote a homeowner may open on cell data — a document that takes
 * fifteen seconds to paint is a document somebody closes.
 *
 * 1600px is chosen to survive being looked at properly: it is sharp on a laptop
 * and on a print of the quote, while landing around 200–400KB.
 *
 * Browser-only — it needs a canvas. Failures are not fatal: anything unexpected
 * returns the original file and lets the server's size limit have the last word,
 * because a photo that uploads slowly beats a photo that doesn't upload.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export async function downscaleImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  // A GIF loses its animation and an SVG has no pixels to resample; both go up
  // untouched rather than being quietly turned into something else.
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
