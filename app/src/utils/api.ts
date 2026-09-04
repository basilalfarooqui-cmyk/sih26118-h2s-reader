import { BACKEND_URL } from "../config/backend";
import type { ReadingPayload } from "../types";

export async function sendReading(payload: ReadingPayload): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/readings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server responded with ${res.status}`);
  }
}
