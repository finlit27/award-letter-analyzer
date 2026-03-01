/**
 * Client-side file converter:
 * - Converts PDFs to PNG images (one per page) using pdf.js
 * - Converts HEIC/HEIF to JPEG using Canvas
 * - Passes through standard image formats unchanged
 * 
 * This is needed because GPT-4o vision API only accepts image formats
 * (PNG, JPEG, WebP, GIF), NOT PDFs or HEIC.
 */

import * as pdfjsLib from "pdfjs-dist";

// Configure the worker
if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Convert a single PDF page to a PNG blob at 2x resolution for clarity.
 */
async function pdfPageToImage(
    page: pdfjsLib.PDFPageProxy,
    scale: number = 2.0
): Promise<Blob> {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Canvas toBlob returned null"));
            },
            "image/png",
            1.0
        );
    });
}

/**
 * Convert a PDF file to an array of PNG image Files (one per page).
 */
async function convertPdfToImages(file: File): Promise<File[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const imageFiles: File[] = [];

    const baseName = file.name.replace(/\.pdf$/i, "");

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const blob = await pdfPageToImage(page);

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
 * This is the universal fix for mobile — works for HEIC, BMP,
 * and any other format the browser can render.
 */
async function normalizeImageToJpeg(file: File): Promise<File> {
    return new Promise<File>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
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
                        resolve(new File([blob], newName, { type: "image/jpeg" }));
                    } else {
                        reject(new Error("Image conversion failed"));
                    }
                },
                "image/jpeg",
                0.92
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            // If the browser can't render the image at all, return original
            // and let the backend deal with it
            console.warn(`Browser cannot render ${file.name}, passing through`);
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

        if (type === "application/pdf" || ext === "pdf") {
            // PDF → render pages to PNG
            onProgress?.(`Converting ${file.name} from PDF to image...`);
            try {
                const images = await convertPdfToImages(file);
                result.push(...images);
                onProgress?.(`Converted ${file.name} → ${images.length} page(s)`);
            } catch (err) {
                console.error(`Failed to convert PDF ${file.name}:`, err);
                throw new Error(
                    `Could not convert "${file.name}" from PDF. Please take a screenshot or photo of the award letter instead.`
                );
            }
        } else if (SUPPORTED_VISION_TYPES.has(type)) {
            // Standard web image — pass through, no conversion needed
            result.push(file);
        } else {
            // HEIC, BMP, empty type, or any other format — normalize to JPEG
            onProgress?.(`Converting ${file.name} to compatible format...`);
            try {
                const converted = await normalizeImageToJpeg(file);
                result.push(converted);
                onProgress?.(`Converted ${file.name}`);
            } catch (err) {
                console.error(`Failed to convert ${file.name}:`, err);
                // Push original as last resort
                result.push(file);
            }
        }
    }

    return result;
}

