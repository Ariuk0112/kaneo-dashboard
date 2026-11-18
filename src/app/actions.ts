"use server";

import { updateTag } from "next/cache";
import { KANEO_CACHE_TAG } from "@/lib/kaneo/requests";

/** Drops the cached Kaneo data so the page reloads it from Kaneo right now. */
export async function refreshKaneoData() {
  updateTag(KANEO_CACHE_TAG);
}
