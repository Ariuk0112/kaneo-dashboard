"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex h-screen items-center justify-center bg-[#0E1E52] font-sans">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-lg font-bold text-slate-800">Kaneo-оос мэдээлэл татаж чадсангүй</h1>
        <p className="mt-2 text-sm text-slate-500">{error.digest ? `Алдааны код: ${error.digest}` : error.message}</p>
        <button onClick={reset} className="mt-5 rounded-full bg-[#0B63F6] px-5 py-2 text-sm font-semibold text-white">
          Дахин оролдох
        </button>
      </div>
    </main>
  );
}
