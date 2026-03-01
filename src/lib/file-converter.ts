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
 * Convert an HEIC/HEIF image to JPEG using Canvas.
 * Modern browsers (Safari, Chrome) can render HEIC natively.
 * If the browser doesn't support it, just pass through and let the API try.
 */
async function convertHeicToJpeg(file: File): Promise<File> {
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
                        const newName = file.name.replace(/\.hei[cf]$/i, ".jpg");
                        resolve(new File([blob], newName, { type: "image/jpeg" }));
                    } else {
                        reject(new Error("HEIC conversion failed"));
                    }
                },
                "image/jpeg",
                0.92
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            // If the browser can't render HEIC, return the original file
            // and let the backend deal with it
            console.warn("Browser cannot render HEIC, passing through original file");
            resolve(file);
        };

        img.src = url;
    });
}

/**
 * Process files for upload:
 * - PDFs → converted to PNG images (one per page)
 * - HEIC/HEIF → converted to JPEG
 * - Other images → passed through unchanged
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
        } else if (
            type === "image/heic" ||
            type === "image/heif" ||
            ext === "heic" ||
            ext === "heif"
        ) {
            onProgress?.(`Converting ${file.name} from HEIC to JPEG...`);
            try {
                const converted = await convertHeicToJpeg(file);
                result.push(converted);
            } catch (err) {
                console.error(`Failed to convert HEIC ${file.name}:`, err);
                // Push original as fallback
                result.push(file);
            }
        } else {
            // Standard image format (PNG, JPG, WebP) - pass through
            result.push(file);
        }
    }

    return result;
}
