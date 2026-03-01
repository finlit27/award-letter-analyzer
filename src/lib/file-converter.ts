/**
 * Client-side file converter:
 * - Converts PDFs to PNG images (one per page) using pdf.js (loaded dynamically)
 * - Normalizes non-standard images (HEIC, BMP, etc.) to JPEG via Canvas
 * - Passes through standard image formats unchanged
 *
 * GPT-4o vision API only accepts: PNG, JPEG, WebP, GIF
 * Everything else must be converted before sending.
 */

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

/**
 * Normalize any image to JPEG via Canvas.
 * Works for HEIC, BMP, TIFF, and any format the browser can render.
 * No external dependencies required.
 */
async function normalizeImageToJpeg(file: File): Promise<File> {
    return new Promise<File>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const newName = file.name.replace(/\.[^.]+$/, ".jpg");
                            resolve(
                                new File([blob], newName, { type: "image/jpeg" })
                            );
                        } else {
                            reject(new Error("Image conversion failed"));
                        }
                    },
                    "image/jpeg",
                    0.92
                );
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            console.warn(
                `[file-converter] Browser cannot render ${file.name} (type=${file.type}), passing through`
            );
            resolve(file);
        };

        img.src = url;
    });
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
 * - Unsupported image formats (HEIC, BMP, empty type) → normalized to JPEG
 * - Standard formats (PNG, JPEG, WebP, GIF) → passed through unchanged
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
            `[file-converter] Processing: ${file.name} | type="${file.type}" | size=${file.size} | ext="${ext}"`
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
                    `Could not convert "${file.name}" from PDF. Please take a screenshot or photo of the award letter instead.`
                );
            }
        } else if (SUPPORTED_VISION_TYPES.has(type)) {
            // Standard web image — pass through, no conversion needed
            console.log(`[file-converter] Pass-through: ${file.name} (${type})`);
            result.push(file);
        } else {
            // HEIC, BMP, empty type, or any other format — normalize to JPEG
            console.log(
                `[file-converter] Normalizing: ${file.name} (type="${type}") → JPEG`
            );
            onProgress?.(`Converting ${file.name} to compatible format...`);
            try {
                const converted = await normalizeImageToJpeg(file);
                result.push(converted);
                console.log(
                    `[file-converter] Normalized: ${file.name} → ${converted.name} (${converted.type}, ${converted.size} bytes)`
                );
            } catch (err) {
                console.error(
                    `[file-converter] Normalization failed for ${file.name}:`,
                    err
                );
                // Push original as last resort
                result.push(file);
            }
        }
    }

    console.log(
        `[file-converter] Done. Input: ${files.length} file(s), Output: ${result.length} file(s)`
    );
    return result;
}
