import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const KIT_BASE = "https://api.kit.com/v4";

const ALLOWED_FORMS = new Set<string>([
  "9354058", // CFO Checklist download (award-letter-analyzer homepage)
]);

export async function POST(req: NextRequest) {
  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  let body: { email?: string; formId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const formId = typeof body.formId === "string" ? body.formId : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!ALLOWED_FORMS.has(formId)) {
    return NextResponse.json({ error: "Unknown form" }, { status: 400 });
  }

  const headers = {
    "Content-Type": "application/json",
    "X-Kit-Api-Key": apiKey,
  };

  const subRes = await fetch(`${KIT_BASE}/subscribers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email }),
  });

  if (!subRes.ok) {
    const text = await subRes.text().catch(() => "");
    console.error("Kit create subscriber failed", subRes.status, text);
    return NextResponse.json({ error: "Subscribe failed" }, { status: 502 });
  }

  const subJson = (await subRes.json()) as { subscriber?: { id?: number } };
  const subId = subJson.subscriber?.id;
  if (!subId) {
    console.error("Kit create subscriber: missing id", subJson);
    return NextResponse.json({ error: "Subscribe failed" }, { status: 502 });
  }

  const referrer = req.headers.get("referer") || "https://analyzer.finlitgarden.com";
  const formRes = await fetch(`${KIT_BASE}/forms/${formId}/subscribers/${subId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ referrer }),
  });

  if (!formRes.ok) {
    const text = await formRes.text().catch(() => "");
    console.error("Kit add to form failed", formRes.status, text);
    return NextResponse.json({ error: "Subscribe failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
