import { NextRequest } from "next/server";
import { loadAnalysis } from "@/lib/kv";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !/^[A-Za-z0-9_-]{6,32}$/.test(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  const record = await loadAnalysis(id);
  if (!record) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(record);
}
