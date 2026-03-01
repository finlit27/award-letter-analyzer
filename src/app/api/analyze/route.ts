import { NextRequest, NextResponse } from "next/server";
import { AnalysisResult } from "@/types";

/**
 * Robustly clean LLM output to extract valid JSON.
 * Handles markdown code fences, trailing commas, and other common LLM quirks.
 */
function cleanLLMJson(raw: string): string {
    let text = raw.trim();

    // Remove markdown code fences (```json ... ``` or ``` ... ```)
    // Handle cases where the fence appears anywhere, not just at the start
    text = text.replace(/```json\s*\n?/gi, "");
    text = text.replace(/```\s*/g, "");
    text = text.trim();

    // Remove any leading/trailing text outside of JSON structure
    // Find the first [ or { and the last ] or }
    const firstBracket = text.search(/[\[{]/);
    const lastBracket = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));

    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        text = text.substring(firstBracket, lastBracket + 1);
    }

    // Remove trailing commas before closing brackets (common LLM mistake)
    text = text.replace(/,\s*([\]}])/g, "$1");

    return text;
}

/**
 * Fetch with a timeout to prevent hanging requests.
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 120000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

        if (!N8N_WEBHOOK_URL) {
            return NextResponse.json(
                { error: "Server configuration error. Please contact support.", details: "N8N_WEBHOOK_URL is not configured." },
                { status: 500 }
            );
        }

        // Get all files from the form data
        const files: File[] = [];
        for (const [key, value] of formData.entries()) {
            if (key === "pdfFile" && value instanceof File) {
                files.push(value);
            }
        }

        if (files.length === 0) {
            return NextResponse.json(
                { error: "No files provided. Please upload at least one award letter." },
                { status: 400 }
            );
        }

        console.log(`[Award Letter Analyzer] Processing ${files.length} file(s)...`);

        // Process each file separately and collect results
        const allResults: AnalysisResult[] = [];
        const errors: string[] = [];

        for (const file of files) {
            try {
                console.log(`[Processing] ${file.name} (${(file.size / 1024).toFixed(1)} KB, type: ${file.type})`);

                // Create form data for this single file
                const singleFileFormData = new FormData();
                singleFileFormData.append("parentEmail", "guest@example.com");
                singleFileFormData.append("studentName", "Guest Student");
                singleFileFormData.append("pdfFile", file);

                const n8nResponse = await fetchWithTimeout(N8N_WEBHOOK_URL, {
                    method: "POST",
                    body: singleFileFormData,
                }, 120000); // 2 minute timeout per file

                console.log(`[n8n Response] ${file.name}: Status ${n8nResponse.status}`);

                if (!n8nResponse.ok) {
                    const errorText = await n8nResponse.text();
                    console.error(`[n8n Error] ${file.name}:`, errorText);

                    if (n8nResponse.status === 404) {
                        errors.push(`${file.name}: Webhook not found. The n8n workflow may be inactive.`);
                    } else if (n8nResponse.status === 500) {
                        errors.push(`${file.name}: AI processing failed. Please try again.`);
                    } else {
                        errors.push(`${file.name}: ${n8nResponse.statusText}`);
                    }
                    continue;
                }

                const responseText = await n8nResponse.text();
                console.log(`[n8n Response] ${file.name} (first 300 chars):`, responseText.substring(0, 300));

                if (!responseText || responseText.trim() === "") {
                    errors.push(`${file.name}: Empty response from AI. The image may be unclear.`);
                    continue;
                }

                // Clean and parse the JSON response
                const cleanedText = cleanLLMJson(responseText);
                console.log(`[Cleaned JSON] ${file.name} (first 300 chars):`, cleanedText.substring(0, 300));

                try {
                    const data = JSON.parse(cleanedText);

                    // Handle both array and single object responses
                    if (Array.isArray(data)) {
                        allResults.push(...data);
                    } else {
                        allResults.push(data);
                    }

                    console.log(`[Success] ${file.name}: Parsed ${Array.isArray(data) ? data.length : 1} result(s)`);
                } catch (parseError) {
                    console.error(`[JSON Parse Error] ${file.name}:`, parseError);
                    console.error(`[Raw Response] ${file.name}:`, responseText);
                    errors.push(`${file.name}: Could not read AI response. Please try re-uploading.`);
                }
            } catch (fileError) {
                console.error(`[File Error] ${file.name}:`, fileError);

                if (fileError instanceof DOMException && fileError.name === "AbortError") {
                    errors.push(`${file.name}: Request timed out. The file may be too large or the AI is busy.`);
                } else {
                    errors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : "Unknown error"}`);
                }
            }
        }

        // Log summary
        console.log(`[Summary] Processed ${files.length} file(s). Results: ${allResults.length}, Errors: ${errors.length}`);
        if (errors.length > 0) {
            console.log(`[Errors]`, errors);
        }

        if (allResults.length === 0) {
            return NextResponse.json(
                {
                    error: "Failed to analyze any files. Please check that you uploaded clear images of award letters.",
                    details: errors.join("; ")
                },
                { status: 502 }
            );
        }

        // Return all results as an array
        return NextResponse.json(allResults);

    } catch (error) {
        console.error("[Fatal Error] Analysis API:", error);
        return NextResponse.json(
            {
                error: "Something went wrong. Please try again.",
                details: error instanceof Error ? error.message : "Unknown"
            },
            { status: 500 }
        );
    }
}

