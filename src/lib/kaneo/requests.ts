import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { getActivities, getAllTasks, type KaneoActivity, type KaneoTask } from "./client";

/** A student request, simplified from a Kaneo task in the "Requests" project. */
export type StudentRequest = {
  number: number | null;
  type: string;
  outcome: "resolved" | "rejected" | "open";
  rejectReasons: string[];
  createdAt: Date;
  closedAt: Date | null;
  dueAt: Date | null;
  closedBy: "staff" | "ai" | null;
};

/** Red labels are rejection reasons ("Баримт дутуу", …). */
const REJECT_LABEL_COLOR = "red";

// `eventData` is untyped in the API spec; this is its shape for status changes.
const statusChange = z.object({ newStatus: z.string() });

/** The "**Хүсэлтийн төрөл:** …" line the request form writes into the description. */
function requestType(task: KaneoTask): string | null {
  const match = /\*\*Хүсэлтийн төрөл:\*\*\s*(.+)/.exec(task.description ?? "");
  return match ? match[1].trim() : null;
}

function isTestSubmission(task: KaneoTask): boolean {
  const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
  return env.testMarkers.some((marker) => text.includes(marker));
}

/** The last time the task was moved to done/rejected. */
function lastClose(activity: KaneoActivity[]) {
  return activity
    .filter((a) => a.type === "status_changed")
    .map((a) => ({ ...a, change: statusChange.safeParse(a.eventData).data }))
    .filter((a) => a.change?.newStatus === "done" || a.change?.newStatus === "rejected")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .at(-1);
}

function toStudentRequest(task: KaneoTask, activity: KaneoActivity[]): StudentRequest {
  const outcome = task.status === "done" ? "resolved" : task.status === "rejected" ? "rejected" : "open";
  const close = outcome === "open" ? undefined : lastClose(activity);

  return {
    number: task.number,
    type: requestType(task) ?? "Тодорхойгүй",
    outcome,
    rejectReasons: task.labels.filter((l) => l.color === REJECT_LABEL_COLOR).map((l) => l.name),
    createdAt: new Date(task.createdAt),
    closedAt: close ? new Date(close.createdAt) : null,
    dueAt: task.dueDate ? new Date(task.dueDate) : null,
    closedBy: close ? (close.userId && env.aiUserIds.has(close.userId.toLowerCase()) ? "ai" : "staff") : null,
  };
}

/**
 * All real student requests from Kaneo.
 * Cached on the server for KANEO_REVALIDATE_SECONDS, so Kaneo is called at most that often.
 */
export async function getStudentRequests(): Promise<StudentRequest[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: env.KANEO_REVALIDATE_SECONDS, expire: 24 * 3600 });
  cacheTag("kaneo");

  const tasks = (await getAllTasks(env.KANEO_PROJECT_ID)).filter(
    (t) =>
      t.status !== "archived" &&
      requestType(t) !== null && // tasks without a request type are internal work, not student requests
      !isTestSubmission(t),
  );
  const activities = await getActivities(tasks.map((t) => t.id));
  return tasks.map((task, i) => toStudentRequest(task, activities[i]));
}
