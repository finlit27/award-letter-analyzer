import sharp from "sharp";

export interface PrepOptions {
  maxDimension?: number;
  quality?: number;
}

export interface PrepResult {
  buffer: Buffer;
  mime: "image/jpeg";
  width: number;
  height: number;
  bytes: number;
}

/**
 * Normalize an image for LLM vision input:
 * - Rotate according to EXIF orientation
 * - Resize so the longest edge is ≤ maxDimension (default 2000px)
 * - Re-encode as JPEG at the given quality (default 85)
 *
 * Input can be any format sharp supports (JPEG, PNG, WebP, HEIC, etc.).
 * PDFs are not handled here — convert to image client-side first.
 */
export async function prepImage(
  input: Buffer | Uint8Array,
  opts: PrepOptions = {},
): Promise<PrepResult> {
  const maxDimension = opts.maxDimension ?? 2000;
  const quality = opts.quality ?? 85;

  const pipeline = sharp(input).rotate().resize({
    width: maxDimension,
    height: maxDimension,
    fit: "inside",
    withoutEnlargement: true,
  });

  const { data, info } = await pipeline
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    mime: "image/jpeg",
    width: info.width,
    height: info.height,
    bytes: info.size,
  };
}
