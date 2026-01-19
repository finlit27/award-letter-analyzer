
import { NextRequest, NextResponse } from "next/server";
import { AnalysisResult } from "@/types";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

        if (!N8N_WEBHOOK_URL) {
            return NextResponse.json(
                { error: "N8N_WEBHOOK_URL is not configured correctly on the server." },
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
                { error: "No files provided" },
                { status: 400 }
            );
        }

        console.log(`Processing ${files.length} files...`);

        // Process each file separately and collect results
        const allResults: AnalysisResult[] = [];
        const errors: string[] = [];

        for (const file of files) {
            try {
                console.log(`Processing file: ${file.name}`);

                // Create form data for this single file
                const singleFileFormData = new FormData();
                singleFileFormData.append("parentEmail", "guest@example.com");
                singleFileFormData.append("studentName", "Guest Student");
                singleFileFormData.append("pdfFile", file);

                const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
                    method: "POST",
                    body: singleFileFormData,
                });

                console.log(`n8n Response for ${file.name}: Status ${n8nResponse.status}`);

                if (!n8nResponse.ok) {
                    const errorText = await n8nResponse.text();
                    console.error(`n8n Error for ${file.name}:`, errorText);
                    errors.push(`${file.name}: ${n8nResponse.statusText}`);
                    continue;
                }

                const responseText = await n8nResponse.text();
                console.log(`n8n Response for ${file.name} (first 200 chars):`, responseText.substring(0, 200));

                if (!responseText || responseText.trim() === "") {
                    errors.push(`${file.name}: Empty response`);
                    continue;
                }

                // Strip markdown code blocks if present
                let cleanedText = responseText.trim();
                if (cleanedText.startsWith('```')) {
                    cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/, '');
                    cleanedText = cleanedText.replace(/\n?```\s*$/, '');
                }

                try {
                    const data = JSON.parse(cleanedText);

                    // Handle both array and single object responses
                    if (Array.isArray(data)) {
                        allResults.push(...data);
                    } else {
                        allResults.push(data);
                    }
                } catch (parseError) {
                    console.error(`JSON parse error for ${file.name}:`, parseError);
                    errors.push(`${file.name}: Invalid JSON response`);
                }
            } catch (fileError) {
                console.error(`Error processing ${file.name}:`, fileError);
                errors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
            }
        }

        // Log summary
        console.log(`Processed ${files.length} files. Results: ${allResults.length}, Errors: ${errors.length}`);

        if (allResults.length === 0) {
            return NextResponse.json(
                {
                    error: "Failed to analyze any files",
                    details: errors.join("; ")
                },
                { status: 502 }
            );
        }

        // Return all results as an array
        return NextResponse.json(allResults);

    } catch (error) {
        console.error("Analysis API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}
