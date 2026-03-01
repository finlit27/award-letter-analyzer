---
description: Standard requirements for building Next.js apps integrated with n8n workflows — covers file uploads, AI vision, mobile compatibility, and deployment.
---

# n8n + Next.js Integration Standard

> **Purpose**: Eliminate debugging time when building new apps that use n8n workflows.
> **Applies to**: Any Next.js app that sends files to an n8n webhook for AI processing.
> **Last validated**: March 2026 — Award Letter Analyzer app

---

## 1. n8n Webhook Binary Property Naming

### The Rule
When n8n receives a multipart form upload, it **automatically appends an index number** to the field name.

| Frontend sends as | n8n names it | What to put in "Image Data" field |
|---|---|---|
| `pdfFile` | `pdfFile0` | `pdfFile0` |
| `image` | `image0` | `image0` |
| `file` | `file0` | `file0` |

### How to verify
1. Send a test upload to the webhook
2. Open n8n → Executions → click latest execution
3. Click the Webhook node → look at Binary tab
4. The actual property name is shown there (e.g., `pdfFile0`)

### n8n Configuration Checklist
- [ ] Webhook node: `binaryPropertyName` matches what frontend sends (e.g., `pdfFile`)
- [ ] Message a model node: "Image Data" field uses the **indexed** name (e.g., `pdfFile0`)
- [ ] Image Type: `File Data` (not `base64` unless you're encoding it yourself)
- [ ] Workflow is **Published** (green dot, not orange)
- [ ] Flow: `Webhook → [optional processing] → Message a model → Respond to Webhook`

---

## 2. GPT-4o Vision API — Supported File Types

### Critical Rule
GPT-4o vision **ONLY** accepts these image formats:
- ✅ `image/png`
- ✅ `image/jpeg`
- ✅ `image/webp`
- ✅ `image/gif`

**REJECTED formats** (will return "unsupported MIME type" error):
- ❌ `application/pdf`
- ❌ `image/heic` / `image/heif` (iPhone photos)
- ❌ `image/bmp`
- ❌ `image/tiff`
- ❌ Any file with empty or unknown MIME type

### Solution: Client-Side Conversion (REQUIRED)
Every app must convert files before sending to n8n:
- **PDFs** → Render to PNG using `pdfjs-dist` (dynamic import only)
- **HEIC/HEIF** → Normalize to JPEG via Canvas
- **Any unknown format** → Normalize to JPEG via Canvas
- **Standard images** → Pass through unchanged

---

## 3. Mobile Phone Photo Handling

### Problems phones cause:
1. **Huge file sizes**: iPhone photos are 5-12MB at 4000x3000px
2. **HEIC format**: Default iPhone format, not supported by GPT-4o
3. **Empty MIME types**: Some Android cameras report `type: ""`
4. **Vercel body limit**: Default 4.5MB rejects raw phone photos silently

### Required defenses:

#### A. Client-side image compression (MANDATORY)
```typescript
const MAX_IMAGE_DIMENSION = 2048; // GPT-4o doesn't need more
const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // Compress anything over 1.5MB

// If file.size > MAX_FILE_SIZE OR type is not in supported set:
//   → Resize to max 2048px dimension
//   → Compress to JPEG at 85% quality
//   → Result: ~200-500KB instead of 8-12MB
```

#### B. Accept filter with `image/*` wildcard
```typescript
// ❌ BAD: Strict types that reject mobile camera output
accept: {
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/heic': ['.heic'],
}

// ✅ GOOD: Wildcard accepts ALL image types from any device
accept: {
    'application/pdf': ['.pdf'],
    'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.gif', '.bmp']
}
```

#### C. NO `capture` attribute on file inputs with react-dropzone
```typescript
// ❌ BAD: Conflicts with react-dropzone, breaks file registration
<input {...getInputProps()} capture="environment" />

// ✅ GOOD: Let the browser decide (shows camera + gallery options on mobile)
<input {...getInputProps()} />
```

#### D. Dynamic import for pdfjs-dist
```typescript
// ❌ BAD: Static import loads 500KB+ library even for image uploads
import * as pdfjsLib from "pdfjs-dist";

// ✅ GOOD: Only loads when a PDF is actually encountered
async function convertPdfToImages(file: File) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    // ...
}
```

---

## 4. Vercel Deployment Configuration

### next.config.ts
```typescript
const nextConfig: NextConfig = {
    serverExternalPackages: ["pdfjs-dist"],
    experimental: {
        serverActions: {
            bodySizeLimit: "20mb",
        },
    },
};
```

### API Route body size limit (route.ts)
```typescript
export const config = {
    api: {
        bodyParser: {
            sizeLimit: "20mb",
        },
    },
};
```

### Environment variables (.env.local)
```
N8N_WEBHOOK_URL=https://pulsivityai.app.n8n.cloud/webhook/<webhook-path>
```

---

## 5. API Route Pattern (Next.js App Router)

### Standard structure for file-to-n8n routes:
```typescript
export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const files: File[] = [];
    
    for (const [key, value] of formData.entries()) {
        if (key === "pdfFile" && value instanceof File) {
            files.push(value);
        }
    }

    // Process EACH file separately (one at a time to n8n)
    for (const file of files) {
        const singleFileFormData = new FormData();
        singleFileFormData.append("pdfFile", file);
        
        const response = await fetchWithTimeout(N8N_WEBHOOK_URL, {
            method: "POST",
            body: singleFileFormData,
        }, 120000); // 2 minute timeout per file
        
        // Parse response...
    }
}
```

### Key rules:
- Send files **one at a time** to n8n (not as a batch)
- Use a **120-second timeout** per file (AI processing takes time)
- **Clean LLM JSON output** — strip markdown fences, trailing commas
- Handle both array `[{...}]` and single object `{...}` responses

---

## 6. n8n Workflow Structure

### Standard 3-node workflow:
```
Webhook → Message a model → Respond to Webhook
```

### With preprocessing (e.g., binary renaming):
```
Webhook → Code (JavaScript) → Message a model → Respond to Webhook
```

### Critical connection rules:
- Every node must have a **visible connection line** to the next
- The Webhook's `responseMode` must be `responseNode`
- Respond to Webhook uses: `{{ $json.output[0].content[0].text }}`
- **Always publish** after changes (green dot, not orange)
- Test the **production webhook URL**, not the test URL

### Code node for binary renaming (when needed):
```javascript
// Normalizes pdfFile0, pdfFile1, etc. → "data"
const items = [];
for (const item of $input.all()) {
    const newItem = { json: item.json, binary: {} };
    for (const [key, value] of Object.entries(item.binary || {})) {
        if (key.startsWith('pdfFile')) {
            newItem.binary.data = value;
        } else {
            newItem.binary[key] = value;
        }
    }
    items.push(newItem);
}
return items;
```

---

## 7. Debugging Checklist

When something fails, check in this order:

### Request not reaching n8n (no executions showing):
1. ☐ Is the photo too large? (>4.5MB without body limit increase)
2. ☐ Is client-side JavaScript crashing? (check browser console)
3. ☐ Is the Vercel API route throwing before calling n8n?
4. ☐ Is the webhook URL correct in `.env.local`?
5. ☐ Is the n8n workflow published and active?

### n8n execution shows error:
1. ☐ Check the binary property name in Webhook output
2. ☐ Does "Image Data" field match that property name?
3. ☐ Is the file type supported? (no PDFs to vision API)
4. ☐ Are all nodes connected? (check for breaks in the flow)

### GPT-4o returns wrong/empty response:
1. ☐ Is the prompt clear and specific about output format?
2. ☐ Add "Return ONLY valid JSON" to the prompt
3. ☐ Clean LLM output: strip markdown fences, trailing commas
4. ☐ Handle both array and object JSON responses

### Mobile-specific failures:
1. ☐ No `capture` attribute on dropzone inputs
2. ☐ Using `image/*` wildcard in accept filter
3. ☐ Client-side compression for large photos
4. ☐ Dynamic import for heavy libraries (pdfjs-dist)
5. ☐ HEIC/HEIF normalization to JPEG

---

## 8. New App Quickstart Checklist

When building a NEW app with n8n + Next.js:

- [ ] Set up Next.js with `bodySizeLimit: "20mb"` from day one
- [ ] Create `file-converter.ts` with compression + format normalization
- [ ] Use `image/*` wildcard in file upload accept filters
- [ ] Dynamic import only for `pdfjs-dist`
- [ ] API route sends files one at a time with 120s timeout
- [ ] API route has `cleanLLMJson()` function for response parsing
- [ ] n8n webhook uses indexed binary name (e.g., `pdfFile0`)
- [ ] n8n Image Data field matches the indexed binary name
- [ ] n8n workflow is Published (green dot)
- [ ] Test from both desktop AND mobile before shipping
