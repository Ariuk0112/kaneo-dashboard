import Link from "next/link";
import clsx from "clsx";
import { PERIODS, type Dashboard, type PeriodKey } from "@/lib/dashboard";
import { TodayPie } from "./TodayPie";

export function Header({ data }: { data: Dashboard }) {
  const { today } = data;

  return (
    <header className="flex items-stretch justify-between gap-6">
      <div className="pt-1">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-white">
          Сургалтын албаны хүсэлтийн тойм
        </h1>
        <nav className="mt-3.5 inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
          {(Object.keys(PERIODS) as PeriodKey[]).map((key) => (
            <Link
              key={key}
              href={`/?period=${key}`}
              scroll={false}
              aria-current={key === data.period ? "page" : undefined}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                key === data.period
                  ? "bg-[#0B63F6] font-semibold text-white shadow-sm"
                  : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              {PERIODS[key].label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="relative -mb-[30px] flex h-[140px] w-[540px] shrink-0 items-start justify-between gap-6 self-start rounded-3xl border border-white/20 bg-gradient-to-b from-[#3D86F8]/95 to-[#0B63F6]/95 px-7 py-5 shadow-xl shadow-blue-900/20 backdrop-blur-md">
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-50">Өнөөдөр</p>
            <p className="text-xs font-medium text-sky-100/80">{today.label}</p>
          </div>
          <div className="mt-3.5 flex items-end gap-10">
            <Stat label="Ирсэн" value={today.arrived} />
            <Stat label="Шийдвэрлэсэн" value={today.staff + today.ai} />
          </div>
        </div>
        <TodayPie arrived={today.arrived} staff={today.staff} ai={today.ai} />
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm font-medium text-sky-100/90">{label}</p>
      <p className="mt-1 text-[32px] font-bold leading-none text-white">{value}</p>
    </div>
  );
}
