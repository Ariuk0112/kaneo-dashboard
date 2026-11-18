"use client";

import { useTransition } from "react";
import clsx from "clsx";
import { refreshKaneoData } from "@/app/actions";

export function RefreshButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => refreshKaneoData())}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20 disabled:opacity-60"
    >
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className={clsx(isPending && "animate-spin")}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
      {isPending ? "Татаж байна…" : "Шинэчлэх"}
    </button>
  );
}
