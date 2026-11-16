import type { Dashboard, Ranked } from "@/lib/dashboard";
import { Card } from "./Card";

export function Breakdown({ data }: { data: Dashboard }) {
  return (
    <Card>
      <h2 className="mb-2.5 text-base font-semibold text-slate-800">Хүсэлтийн задаргаа</h2>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
        <RankedList title="Хамгийн их ирсэн хүсэлтүүд" total={data.kpi.total} items={data.topTypes} dot="bg-[#0B63F6]" text="text-[#0B63F6]" />
        <RankedList title="Татгалзсан шалтгаанууд" total={data.kpi.rejected} items={data.rejectReasons} dot="bg-red-400" text="text-red-500" />
        <RankedList title="Хугацаа хэтэрсэн хүсэлтүүд" total={data.kpi.overdue} items={data.overdueTypes} dot="bg-amber-400" text="text-amber-500" />
      </div>
    </Card>
  );
}

type Props = { title: string; total: number; items: Ranked[]; dot: string; text: string };

function RankedList({ title, total, items, dot, text }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-2xl bg-slate-50/80 p-3.5 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200/70 pb-2 text-[clamp(14px,1.1vw,16px)]">
        <span className="flex min-w-0 items-start gap-2">
          <span className={`mt-[0.45em] size-2 shrink-0 rounded-full ${dot}`} />
          <h3 className="font-semibold leading-tight text-balance text-slate-800">{title}</h3>
        </span>
        <span className={`shrink-0 font-bold leading-tight tabular-nums ${text}`}>{total}</span>
      </div>
      <ul className="min-h-0 divide-y divide-slate-200/60 overflow-hidden">
        {items.length === 0 && <li className="py-1.5 text-sm text-slate-400">Мэдээлэл алга</li>}
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 py-1.5 transition-colors hover:bg-white/70">
            <span className="min-w-0 text-sm font-medium leading-tight text-slate-600">{item.label}</span>
            <span className={`shrink-0 text-sm font-bold tabular-nums ${text}`}>{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
