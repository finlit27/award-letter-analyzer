# Award Letter Analyzer

Upload college financial aid award letters → get a side-by-side CFO-style comparison.
Built for [FinLit Garden](https://finlitgarden.com).

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Zod · Upstash Redis · n8n + Anthropic Claude (Haiku 4.5 with Sonnet 4.6 fallback) · Vercel Pro.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `N8N_WEBHOOK_URL_V2` | Vercel + local | URL of the v2 n8n webhook (Haiku → Sonnet fallback) |
| `UPSTASH_REDIS_REST_URL` | Vercel (Marketplace integration) | KV store for shareable analyses |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel (Marketplace integration) | KV auth |
| `ANTHROPIC_API_KEY` | **n8n credentials**, not Vercel | Used by the n8n workflow's Claude HTTP nodes |

## n8n workflow

1. In n8n, **Workflows → Import from File** → pick `n8n/v2-workflow.json`.
2. Open both Claude HTTP nodes and select your Anthropic credential.
3. Activate the workflow.
4. Note the production webhook URL (`/webhook/v2/award-letter-batch-analysis`) and put it in `N8N_WEBHOOK_URL_V2`.

Smoke test:
```bash
curl -X POST "$N8N_WEBHOOK_URL_V2" -F "pdfFile=@some-letter.jpg"
```
Expected: a JSON object matching `AwardLetterSchema` in `src/lib/schema.ts`.

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build
npm test         # vitest unit + integration
npm run lint     # eslint
```

## Architecture

```
Browser ──upload──▶ /api/analyze (SSE, Node runtime, 60s)
                         │
                         ├─ sharp prep (rotate, resize, JPEG)
                         ├─ p-limit(3) ──▶ n8n v2 webhook ──▶ Anthropic
                         ├─ Zod validate
                         ├─ Upstash Redis save (30-day TTL)
                         └─ stream { result | error | done } events
                                                 │
                                                 ▼
                                /analyze/[shareId] (server component)
```

Source layout:

```
src/app/                  Next.js routes
src/app/api/analyze       SSE upload + analyze pipeline
src/app/api/share/[id]    KV read endpoint
src/app/analyze/[id]      Shareable dashboard page
src/components/upload     Dropzone, FilePreview
src/components/results    ComparisonTable, charts, gauges
src/lib                   schema, money, projection, kv, sse, image-prep, analytics
n8n                       Workflow JSON
tests/unit                Vitest unit tests
tests/integration         Vitest integration tests (mocked fetch + redis)
```

## Deploy

Wired for Vercel. The `tier2-upgrade` branch ships:

- 60s function timeout (`maxDuration = 60`)
- SSE streaming via Node runtime
- Vercel Analytics (`@vercel/analytics`)
- Upstash Redis via Vercel Marketplace integration

To cut over: merge `tier2-upgrade` → `main`, ensure env vars are set in **Production**, redeploy. Keep the v1 n8n workflow active for rollback.
