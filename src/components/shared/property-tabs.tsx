"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Property {
  id: string;
  name: string;
}

export function PropertyTabs({
  properties,
  counts,
  currentPropertyId,
  totalCount,
}: {
  properties: Property[];
  counts: Record<string, number>;
  currentPropertyId?: string;
  totalCount: number;
}) {
  const searchParams = useSearchParams();

  const createPropertyURL = (propertyId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (propertyId === undefined) {
      params.delete("propertyId");
    } else {
      params.set("propertyId", propertyId);
    }
    // Switch properties resets floor and page selection to avoid out-of-bounds queries
    params.delete("floor");
    params.delete("page");
    return `?${params.toString()}`;
  };

  if (properties.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap py-1 border-b border-slate-100 pb-3 mb-2">
      {/* All Properties tab */}
      <a
        href={createPropertyURL(undefined)}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
          currentPropertyId === undefined
            ? "bg-slate-900 text-white shadow-sm"
            : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
        )}
      >
        All Properties
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          currentPropertyId === undefined ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
        )}>
          {totalCount}
        </span>
      </a>

      {properties.map((p) => {
        const count = counts[p.id] ?? 0;
        return (
          <a
            key={p.id}
            href={createPropertyURL(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
              currentPropertyId === p.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
            )}
          >
            {p.name}
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              currentPropertyId === p.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
            )}>
              {count}
            </span>
          </a>
        );
      })}
    </div>
  );
}
