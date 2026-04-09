/**
 * Client-side file prep wrapper.
 * - HEIC files get decoded via heic2any first
 * - Everything else goes through the existing convertFilesForVision pipeline
 *   (PDF → PNG, large/unsupported → compressed JPEG, small standard → passthrough)
 * - Generates thumbnail data URLs for upload UI previews
 */

import { convertFilesForVision } from "@/lib/file-converter";

export interface PreppedFile {
  /** The processed File ready to send to /api/analyze */
  file: File;
  /** Original filename for display */
  originalName: string;
  /** Object URL for thumbnail rendering */
  previewUrl: string;
  /** "image" | "pdf" — drives icon choice */
  kind: "image" | "pdf";
}

function isHeic(file: File): boolean {
  const t = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return t === "image/heic" || t === "image/heif" || ext === "heic" || ext === "heif";
}

async function decodeHeic(file: File): Promise<File> {
  // Dynamic import — only loads when a HEIC is actually uploaded.
  const heic2any = (await import("heic2any")).default;
  const blob = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })) as Blob;
  const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([blob], newName, { type: "image/jpeg" });
}

/**
 * Process a list of raw user-uploaded files into upload-ready files with thumbnails.
 * Order of operations: HEIC decode → existing converter (PDF/compress) → thumbnail.
 */
export async function prepFiles(
  files: File[],
  onProgress?: (msg: string) => void,
): Promise<PreppedFile[]> {
  // Pass 1: HEIC → JPEG
  const decoded: File[] = [];
  for (const f of files) {
    if (isHeic(f)) {
      onProgress?.(`Decoding ${f.name}…`);
      try {
        decoded.push(await decodeHeic(f));
      } catch (err) {
        console.error("[image-prep-client] HEIC decode failed", err);
        // Push original — server-side sharp will try with libheif support.
        decoded.push(f);
      }
    } else {
      decoded.push(f);
    }
  }

  // Pass 2: existing converter (PDF, compression, normalization).
  // Note: a multi-page PDF expands to N images, so the output count may differ from input.
  const converted = await convertFilesForVision(decoded, onProgress);

  // Pass 3: build preview URLs.
  return converted.map<PreppedFile>((file) => ({
    file,
    originalName: file.name,
    previewUrl: URL.createObjectURL(file),
    kind: file.type === "application/pdf" ? "pdf" : "image",
  }));
}

/** Free preview URLs once they're no longer needed. */
export function releasePreviews(prepped: PreppedFile[]): void {
  for (const p of prepped) {
    try {
      URL.revokeObjectURL(p.previewUrl);
    } catch {
      /* noop */
    }
  }
}
