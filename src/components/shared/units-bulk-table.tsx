"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Building2, Layers, Maximize2, CheckSquare, Square, Minus, X, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnitActions } from "./unit-actions";
import { bulkUpdateUnits } from "@/lib/actions/properties";
import { toast } from "sonner";

const formatFloor = (f: number) => {
  if (f === -1) return "Basement";
  if (f === 0) return "Ground";
  const s = f === 1 ? "st" : f === 2 ? "nd" : f === 3 ? "rd" : "th";
  return `${f}${s} Floor`;
};

type BulkField = "floor" | "status" | "type" | "rentAmount" | "qrPrinted";

const BULK_FIELDS: { value: BulkField; label: string }[] = [
  { value: "floor",      label: "Floor" },
  { value: "status",     label: "Status" },
  { value: "type",       label: "Unit Type" },
  { value: "rentAmount", label: "Rent Amount" },
  { value: "qrPrinted",  label: "QR Code Printed Status" },
];

export function UnitsBulkTable({ units, currency }: { units: any[]; currency: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<BulkField>("floor");
  const [bulkValue, setBulkValue] = useState<string>("0");
  const [isPending, startTransition] = useTransition();

  const handleTogglePrinted = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const result = await bulkUpdateUnits([id], { qrPrinted: !currentStatus });
      if (result.success) {
        toast.success(`Unit marked as ${!currentStatus ? "Printed" : "Pending"}.`);
      } else {
        toast.error("Failed to update status.");
      }
    });
  };

  const allSelected = units.length > 0 && selected.size === units.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(units.map(u => u.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleBulkApply = () => {
    if (selected.size === 0) return;
    startTransition(async () => {
      const ids = Array.from(selected);
      let data: any = {};

      if (bulkField === "floor")       data.floor = parseInt(bulkValue);
      if (bulkField === "status")      data.status = bulkValue;
      if (bulkField === "type")        data.type = bulkValue;
      if (bulkField === "rentAmount")  data.rentAmount = parseFloat(bulkValue);
      if (bulkField === "qrPrinted")   data.qrPrinted = bulkValue === "true";

      const result = await bulkUpdateUnits(ids, data);
      if (result.success) {
        toast.success(`Updated ${result.count} unit${(result.count ?? 0) > 1 ? "s" : ""} successfully.`);
        setSelected(new Set());
      } else {
        toast.error(result.error || "Bulk update failed.");
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Bulk Action Bar ────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-slate-900 text-white rounded-xl px-4 py-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 shrink-0">
            <CheckSquare size={16} className="text-blue-400" />
            <span className="text-xs font-bold">{selected.size} selected</span>
          </div>

          <div className="flex items-center gap-2 flex-1">
            {/* Field selector */}
            <select
              className="h-8 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-semibold px-2 outline-none"
              value={bulkField}
              onChange={(e) => {
                const f = e.target.value as BulkField;
                setBulkField(f);
                if (f === "floor") setBulkValue("0");
                else if (f === "status") setBulkValue("AVAILABLE");
                else if (f === "type") setBulkValue("Studio");
                else if (f === "rentAmount") setBulkValue("0");
                else if (f === "qrPrinted") setBulkValue("true");
              }}
            >
              {BULK_FIELDS.map(f => (
                <option key={f.value} value={f.value} className="text-slate-900">{f.label}</option>
              ))}
            </select>

            {/* Dynamic value input */}
            {bulkField === "floor" && (
              <select
                className="h-8 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-semibold px-2 outline-none"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
              >
                <option value="-1" className="text-slate-900">Basement</option>
                <option value="0"  className="text-slate-900">Ground</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={String(n)} className="text-slate-900">
                    {n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`} Floor
                  </option>
                ))}
              </select>
            )}

            {bulkField === "status" && (
              <select
                className="h-8 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-semibold px-2 outline-none"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
              >
                <option value="AVAILABLE"   className="text-slate-900">Available</option>
                <option value="MAINTENANCE" className="text-slate-900">Maintenance</option>
              </select>
            )}

            {bulkField === "type" && (
              <select
                className="h-8 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-semibold px-2 outline-none"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
              >
                {["Studio","1BR","2BR","3BR","Office","Retail"].map(t => (
                  <option key={t} value={t} className="text-slate-900">{t}</option>
                ))}
              </select>
            )}

            {bulkField === "rentAmount" && (
              <Input
                type="number"
                placeholder="Amount"
                value={bulkValue === "0" ? "" : bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="h-8 w-32 rounded-lg bg-white/10 border-white/20 text-white text-xs font-semibold placeholder:text-white/40"
              />
            )}

            {bulkField === "qrPrinted" && (
              <select
                className="h-8 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-semibold px-2 outline-none"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
              >
                <option value="true" className="text-slate-900">Mark as Printed</option>
                <option value="false" className="text-slate-900">Mark as Pending (Not Printed)</option>
              </select>
            )}

            <Button
              size="sm"
              onClick={handleBulkApply}
              disabled={isPending}
              className="h-8 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold px-4 shadow-none"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : (
                <><Pencil size={12} className="mr-1.5" /> Apply</>
              )}
            </Button>
          </div>

          <button
            onClick={() => setSelected(new Set())}
            className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              {/* Select-all checkbox */}
              <th className="py-3 pl-4 pr-2 w-10">
                <button onClick={toggleAll} className="text-slate-400 hover:text-slate-700 transition-colors">
                  {allSelected
                    ? <CheckSquare size={15} className="text-blue-500" />
                    : someSelected
                    ? <Minus size={15} className="text-blue-400" />
                    : <Square size={15} />}
                </button>
              </th>
              <th className="py-3 px-4">Unit</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Specs</th>
              <th className="py-3 px-4">Financials</th>
              <th className="py-3 px-4 text-center">QR Sticker</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {units.map((unit) => {
              const isSelected = selected.has(unit.id);
              return (
                <tr
                  key={unit.id}
                  className={cn(
                    "hover:bg-slate-50/50 transition-colors",
                    isSelected && "bg-blue-50/50 hover:bg-blue-50"
                  )}
                >
                  <td className="py-3 pl-4 pr-2">
                    <button onClick={() => toggleOne(unit.id)} className="text-slate-400 hover:text-blue-500 transition-colors">
                      {isSelected
                        ? <CheckSquare size={15} className="text-blue-500" />
                        : <Square size={15} />}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center border shrink-0",
                        isSelected ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        <Home size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Unit {unit.unitNumber}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">{unit.type}</p>
                        {unit.status === "OCCUPIED" && unit.leases?.[0]?.tenant && (
                          <p className="text-[10px] text-emerald-600 font-medium mt-0.5 truncate max-w-[140px]">
                            Occupied by: {unit.leases[0].tenant.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Building2 size={12} className="text-slate-400" />
                        {unit.property.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Layers size={10} /> {formatFloor(unit.floor ?? 0)}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
                      <Maximize2 size={12} className="text-slate-400" />
                      <span>{unit.size} m²</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-slate-900">{currency} {unit.rentAmount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">monthly rent</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span 
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer select-none transition-all duration-200",
                        unit.qrPrinted
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80"
                          : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                      )}
                      onClick={() => handleTogglePrinted(unit.id, unit.qrPrinted)}
                    >
                      {unit.qrPrinted ? "Printed" : "Pending"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-tight border",
                      unit.status === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : unit.status === "MAINTENANCE"
                        ? "bg-slate-50 text-slate-500 border-slate-200"
                        : "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {unit.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <UnitActions unit={unit} />
                  </td>
                </tr>
              );
            })}
            {units.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-slate-400 font-medium italic">
                  No units found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
