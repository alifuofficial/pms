"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const formatFloor = (f: number) => {
  if (f === -1) return "Basement";
  if (f === 0)  return "Ground";
  const s = f === 1 ? "st" : f === 2 ? "nd" : f === 3 ? "rd" : "th";
  return `${f}${s} Floor`;
};

export function FloorTabs({
  floors,
  counts,
  currentFloor,
  totalCount,
}: {
  floors: number[];
  counts: Record<number, number>;
  currentFloor?: number;
  totalCount: number;
}) {
  const searchParams = useSearchParams();

  const createFloorURL = (floor?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (floor === undefined) {
      params.delete("floor");
    } else {
      params.set("floor", String(floor));
    }
    params.delete("page");
    return `?${params.toString()}`;
  };

  if (floors.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap py-1">
      {/* All tab */}
      <Link
        href={createFloorURL(undefined)}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
          currentFloor === undefined
            ? "bg-slate-900 text-white shadow-sm"
            : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
        )}
      >
        All
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          currentFloor === undefined ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
        )}>
          {totalCount}
        </span>
      </Link>

      {floors.map((f) => (
        <Link
          key={f}
          href={createFloorURL(f)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
            currentFloor === f
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
          )}
        >
          {formatFloor(f)}
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded",
            currentFloor === f ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
          )}>
            {counts[f] ?? 0}
          </span>
        </Link>
      ))}
    </div>
  );
}
