"use server";

import path from "path";
import { randomUUID } from "crypto";
import { requireJobAccess } from "@/lib/auth";
import { storage } from "@/lib/storage";

/**
 * A photo against one line of a quote.
 *
 * The bytes go up the moment the roofer picks the file; the *link* between the
 * photo and the row is saved with the rest of the document, under the one Save
 * the builder has always had. Uploading immediately is what makes the thumbnail
 * appear while they carry on typing, and the alternative — holding a 4MB file
 * in form state until Save — is how you lose a quote to a dropped connection.
 *
 * The cost of that split is an orphaned object when somebody uploads and then
 * abandons the quote. That is the right way round: a few unreferenced files in
 * a bucket are cheap, and a photo that vanishes when the page reloads is the
 * kind of thing that makes a contractor stop trusting the tool.
 */
export type UploadLinePhotoResult = { url?: string; error?: string };

/** Comfortably above a browser-downscaled photo, well under what a phone shoots. */
const MAX_BYTES = 4 * 1024 * 1024;

export async function uploadQuoteLinePhotoAction(
  formData: FormData
): Promise<UploadLinePhotoResult> {
  const jobId = String(formData.get("jobId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  const file = formData.get("photo");

  if (!jobId || !quoteId) return { error: "Something went wrong. Try that again." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't a photo." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That photo is too big. Try one taken at a smaller size." };
  }

  await requireJobAccess(jobId, "editQuote");

  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await storage.put(
    `quotes/${quoteId}/${randomUUID()}${extension}`,
    bytes,
    file.type
  );

  // No revalidate. Nothing on the page is stale — the builder holds the URL in
  // draft state until the quote is saved, exactly like every other edit.
  return { url };
}
