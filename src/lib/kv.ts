import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import type { AwardLetter } from "@/lib/schema";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export interface StoredAnalysis {
  results: AwardLetter[];
  errors: string[];
  createdAt: number;
}

let _client: Redis | null = null;
function client(): Redis {
  if (_client) return _client;
  // Upstash Vercel integration auto-sets these env vars.
  _client = Redis.fromEnv();
  return _client;
}

/** Persist an analysis and return a short share ID. */
export async function saveAnalysis(
  data: Omit<StoredAnalysis, "createdAt">,
): Promise<string> {
  const id = nanoid(10);
  const record: StoredAnalysis = { ...data, createdAt: Date.now() };
  await client().set(`analysis:${id}`, record, { ex: THIRTY_DAYS_SECONDS });
  return id;
}

/** Load an analysis by share ID. Returns null if missing or expired. */
export async function loadAnalysis(id: string): Promise<StoredAnalysis | null> {
  const record = await client().get<StoredAnalysis>(`analysis:${id}`);
  return record ?? null;
}
