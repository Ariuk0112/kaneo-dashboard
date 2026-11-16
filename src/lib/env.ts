import "server-only";
import { z } from "zod";

/** Server-side settings, validated once at startup. See .env.example. */
const schema = z.object({
  KANEO_API_URL: z.url().default("https://api.kaneo.ufe.edu.mn/api"),
  KANEO_API_TOKEN: z.string().min(1, "KANEO_API_TOKEN is required"),
  KANEO_PROJECT_ID: z.string().default("oon14b0oskd5nmec1ki0wvj5"), // "Requests" (REQ)
  KANEO_REVALIDATE_SECONDS: z.coerce.number().int().positive().default(300),
  KANEO_AI_USER_IDS: z.string().default(""),
  KANEO_TEST_MARKERS: z.string().default("b24fm1195,pentest,tes test"),
});

const list = (s: string) =>
  s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

const parsed = schema.parse(process.env);

export const env = {
  ...parsed,
  /** Kaneo user ids whose resolutions count as "Azaa AI". */
  aiUserIds: new Set(list(parsed.KANEO_AI_USER_IDS)),
  /** Substrings (title/description) that mark test submissions. */
  testMarkers: list(parsed.KANEO_TEST_MARKERS),
};
