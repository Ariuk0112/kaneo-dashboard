import clsx from "clsx";

/** White rounded panel used by every dashboard widget. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "flex h-full min-h-0 flex-col rounded-3xl bg-white shadow-[0_8px_24px_-8px_rgba(10,62,168,0.14)] transition-shadow hover:shadow-[0_12px_32px_-8px_rgba(10,62,168,0.22)]",
        className ?? "p-5",
      )}
    >
      {children}
    </div>
  );
}
