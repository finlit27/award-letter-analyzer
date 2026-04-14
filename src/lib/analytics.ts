import { track } from "@vercel/analytics";

type EventName =
  | "upload_started"
  | "analyze_succeeded"
  | "analyze_failed"
  | "share_created"
  | "share_viewed"
  | "gate_shown"
  | "checkout_started"
  | "checkout_completed";

export function trackEvent(name: EventName, props?: Record<string, string | number | boolean | null>) {
  try {
    track(name, props);
  } catch {
    // analytics never throws into UX
  }
}
