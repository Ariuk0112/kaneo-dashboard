import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { env } from "@/lib/env";
import type { PeriodKey } from "@/lib/dashboard";
import { chatbotDashboardSchema, type ChatbotDashboard } from "./schema";

/** Tag on the cached chatbot numbers; the Kaneo webhook and «Шинэчлэх» drop it. */
export const CHATBOT_CACHE_TAG = "chatbot";

export const chatbotConfigured = Boolean(env.CHATBOT_API_URL && env.CHATBOT_DASHBOARD_TOKEN);

/** Throws on any failure: a thrown result is not cached, so the next request tries again. */
async function fetchChatbotDashboard(period: PeriodKey): Promise<ChatbotDashboard> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  cacheTag(CHATBOT_CACHE_TAG);

  const url = `${env.CHATBOT_API_URL.replace(/\/+$/, "")}/api/v1/requests/dashboard/service?period=${period}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.CHATBOT_DASHBOARD_TOKEN}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000), // the page waits for this
  });
  if (!response.ok) throw new Error(`Chatbot API: HTTP ${response.status}`);
  return chatbotDashboardSchema.parse(await response.json());
}

/**
 * The chatbot's request numbers for the period.
 * "off" = CHATBOT_API_URL / token unset; "error" = configured but the call or its shape failed.
 */
export async function getChatbotDashboard(period: PeriodKey): Promise<ChatbotDashboard | "off" | "error"> {
  if (!chatbotConfigured) return "off";
  try {
    return await fetchChatbotDashboard(period);
  } catch (error) {
    console.error("Chatbot dashboard unavailable:", error);
    return "error";
  }
}
