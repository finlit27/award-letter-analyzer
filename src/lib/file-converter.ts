/**
 * Client-side file converter:
 * - Converts PDFs to PNG images (one per page) using pdf.js (loaded dynamically)
 * - Compresses large images (phone cameras) to a reasonable size
 * - Normalizes non-standard images (HEIC, BMP, etc.) to JPEG via Canvas
 * - Passes through small standard image formats unchanged
 *
 * GPT-4o vision API only accepts: PNG, JPEG, WebP, GIF
 * Everything else must be converted before sending.
 */

/** Max dimension in pixels — GPT-4o doesn't need more than this */
const MAX_IMAGE_DIMENSION = 2048;

/** Max file size in bytes before we compress (1.5 MB) */
const MAX_FILE_SIZE = 1.5 * 1024 * 1024;

/**
 * Compress/resize an image via Canvas.
 * Shrinks images larger than MAX_IMAGE_DIMENSION and compresses to JPEG.
 * This is essential for phone camera photos which are often 5-12MB.
 */
function compressImage(file: File): Promise<File> {
    return new Promise<File>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            try {
                let { naturalWidth: w, naturalHeight: h } = img;

                // Scale down if larger than max dimension
                if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
                    const ratio = Math.min(
                        MAX_IMAGE_DIMENSION / w,
                        MAX_IMAGE_DIMENSION / h
                    );
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }

                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(url);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const newName = file.name.replace(/\.[^.]+$/, ".jpg");
                            resolve(
                                new File([blob], newName, { type: "image/jpeg" })
                            );
                        } else {
                            reject(new Error("Image compression failed"));
                        }
                    },
                    "image/jpeg",
                    0.85
                );
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            console.warn(
                `[file-converter] Browser cannot load ${file.name} (type=${file.type}), passing through`
            );
            // Return original file as fallback
            resolve(file);
        };

        img.src = url;
    });
}

/**
 * Convert a PDF file to an array of PNG image Files (one per page).
 * pdf.js is loaded DYNAMICALLY so it doesn't break image-only uploads.
 */
async function convertPdfToImages(file: File): Promise<File[]> {
    // Dynamic import — only loads when a PDF is actually uploaded
    const pdfjsLib = await import("pdfjs-dist");

    // Configure the worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const imageFiles: File[] = [];
    const baseName = file.name.replace(/\.pdf$/i, "");

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
                "image/png",
                1.0
            );
        });

        const pageName =
            pdf.numPages === 1
                ? `${baseName}.png`
                : `${baseName}_page${i}.png`;

        imageFiles.push(new File([blob], pageName, { type: "image/png" }));
    }

    return imageFiles;
}

/** MIME types that GPT-4o vision API definitely supports */
const SUPPORTED_VISION_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
]);

/**
 * Process files for upload:
 * - PDFs → converted to PNG images (one per page)
 * - Large images (>1.5MB) → compressed and resized to fit
 * - Unsupported formats (HEIC, BMP, empty type) → normalized to JPEG
 * - Small standard formats → passed through unchanged
 *
 * @returns Array of image Files ready for the vision API
 */
export async function convertFilesForVision(
    files: File[],
    onProgress?: (message: string) => void
): Promise<File[]> {
    const result: File[] = [];

    for (const file of files) {
        const type = file.type.toLowerCase();
        const ext = file.name.split(".").pop()?.toLowerCase() || "";

        console.log(
            `[file-converter] Processing: ${file.name} | type="${file.type}" | size=${(file.size / 1024 / 1024).toFixed(2)}MB | ext="${ext}"`
        );

        if (type === "application/pdf" || ext === "pdf") {
            // PDF → render pages to PNG using dynamically-loaded pdf.js
            onProgress?.(`Converting ${file.name} from PDF to image...`);
            try {
                const images = await convertPdfToImages(file);
                result.push(...images);
                onProgress?.(
                    `Converted ${file.name} → ${images.length} page(s)`
                );
            } catch (err) {
                console.error(`[file-converter] PDF conversion failed:`, err);
                throw new Error(
                    `Could not convert "${file.name}" from PDF. Please take a screenshot or photo instead.`
                );
            }
        } else if (SUPPORTED_VISION_TYPES.has(type) && file.size <= MAX_FILE_SIZE) {
            // Standard web image AND small enough — pass through
            console.log(`[file-converter] Pass-through: ${file.name} (${type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            result.push(file);
        } else {
            // Either: non-standard format OR too large for direct upload
            // Compress and normalize to JPEG via Canvas
            const reason = !SUPPORTED_VISION_TYPES.has(type)
                ? `unsupported type "${type}"`
                : `too large (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
            console.log(`[file-converter] Compressing: ${file.name} (${reason})`);
            onProgress?.(`Optimizing ${file.name}...`);

            try {
                const compressed = await compressImage(file);
                console.log(
                    `[file-converter] Compressed: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) → ${compressed.name} (${(compressed.size / 1024 / 1024).toFixed(2)}MB)`
                );
                result.push(compressed);
            } catch (err) {
                console.error(
                    `[file-converter] Compression failed for ${file.name}:`,
                    err
                );
                // Push original as last resort
                result.push(file);
            }
        }
    }

    console.log(
        `[file-converter] Done. Input: ${files.length} file(s), Output: ${result.length} file(s), Total size: ${(result.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(2)}MB`
    );
    return result;
}
