"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronDown,
  Filter,
  Loader2,
  Search,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { waivePenalty } from "@/lib/actions/payments";
import { toast } from "sonner";

interface PenaltyItem {
  id: string;
  amount: number;
  dueDate: string | Date;
  status: string;
  tenant: { id: string; name: string; email?: string; phoneNumber?: string };
  lease: {
    id: string;
    unit: {
      id: string;
      unitNumber: string;
      property: { name: string; id: string };
    };
  };
}

interface PenaltyManagementViewProps {
  penalties: PenaltyItem[];
  currency: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  UNPAID: {
    label: "Unpaid",
    cls: "bg-red-50 text-red-600 border-red-100",
  },
  PARTIAL: {
    label: "Partial",
    cls: "bg-amber-50 text-amber-600 border-amber-100",
  },
  PAID: {
    label: "Paid",
    cls: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  WAIVED: {
    label: "Waived",
    cls: "bg-slate-50 text-slate-400 border-slate-100",
  },
};

export function PenaltyManagementView({
  penalties: initialPenalties,
  currency,
}: PenaltyManagementViewProps) {
  const [penalties, setPenalties] = useState<PenaltyItem[]>(initialPenalties);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [waivingId, setWaivingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter logic
  const filtered = penalties.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.tenant.name.toLowerCase().includes(q) ||
      p.lease?.unit?.unitNumber?.toLowerCase().includes(q) ||
      p.lease?.unit?.property?.name?.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === "ALL" || p.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleWaiveClick = (pId: string) => {
    if (confirmId === pId) {
      const item = penalties.find((pen) => pen.id === pId);
      if (item) executeWaive(item);
      setConfirmId(null);
    } else {
      setConfirmId(pId);
      setTimeout(() => {
        setConfirmId((prev) => (prev === pId ? null : prev));
      }, 3000);
    }
  };

  const executeWaive = async (p: PenaltyItem) => {
    setWaivingId(p.id);
    try {
      const result = await waivePenalty({
        penaltyId: p.id,
        leaseId: p.lease.id,
        dueDate: p.dueDate,
        amount: p.amount,
      });
      if (result.success) {
        toast.success(
          `Waived ${currency} ${p.amount.toLocaleString()} penalty for Unit ${p.lease?.unit?.unitNumber}`
        );
        // Optimistically mark as waived in local state
        setPenalties((prev) =>
          prev.map((pen) =>
            pen.id === p.id ? { ...pen, status: "WAIVED" } : pen
          )
        );
      } else {
        toast.error(result.error || "Failed to waive penalty");
      }
    } catch {
      toast.error("An error occurred while waiving the penalty");
    } finally {
      setWaivingId(null);
    }
  };

  const stats = {
    total: penalties.length,
    unpaid: penalties.filter((p) => p.status === "UNPAID").length,
    partial: penalties.filter((p) => p.status === "PARTIAL").length,
    waived: penalties.filter((p) => p.status === "WAIVED").length,
    totalAmount: penalties
      .filter((p) => p.status !== "WAIVED" && p.status !== "PAID")
      .reduce((s, p) => s + p.amount, 0),
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Penalty Management
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Review, track, and waive outstanding late-fee penalties across all
            units.
            <span className="ml-2 text-slate-400">
              ({penalties.length} total)
            </span>
          </p>
        </div>
        {/* Search + Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tenant, unit or property…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-64 bg-white border-slate-200 rounded-lg text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {/* Status dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="WAIVED">Waived</option>
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-3 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total Penalties",
            value: stats.total,
            color: "text-slate-700",
            bg: "bg-slate-50",
          },
          {
            label: "Unpaid",
            value: stats.unpaid,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "Partial",
            value: stats.partial,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Waived",
            value: stats.waived,
            color: "text-slate-400",
            bg: "bg-slate-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-xl border border-slate-100 p-4 space-y-1",
              s.bg
            )}
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              {s.label}
            </p>
            <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Outstanding amount banner */}
      {stats.totalAmount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-5 py-3.5">
          <AlertCircle size={16} className="text-amber-500 shrink-0" />
          <p className="text-sm font-semibold text-amber-700">
            Total outstanding penalty amount:{" "}
            <span className="font-black">
              {currency} {stats.totalAmount.toLocaleString()}
            </span>
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-3 px-6">Tenant</th>
              <th className="py-3 px-6">Unit / Property</th>
              <th className="py-3 px-6">Month Due</th>
              <th className="py-3 px-6">Amount</th>
              <th className="py-3 px-6 text-center">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length > 0 ? (
              filtered.map((p) => {
                const s = STATUS_LABELS[p.status] ?? STATUS_LABELS["UNPAID"];
                const isWaived = p.status === "WAIVED" || p.status === "PAID";
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors",
                      isWaived && "opacity-50"
                    )}
                  >
                    {/* Tenant */}
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                          <User size={15} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {p.tenant.name}
                          </p>
                          {p.tenant.phoneNumber && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              {p.tenant.phoneNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Unit */}
                    <td className="py-3 px-6">
                      <p className="text-xs font-semibold text-slate-800">
                        Unit {p.lease?.unit?.unitNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {p.lease?.unit?.property?.name}
                      </p>
                    </td>
                    {/* Month */}
                    <td className="py-3 px-6">
                      <p className="text-xs font-semibold text-slate-700">
                        {new Date(p.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Due: {new Date(p.dueDate).toLocaleDateString()}
                      </p>
                    </td>
                    {/* Amount */}
                    <td className="py-3 px-6">
                      <p
                        className={cn(
                          "text-sm font-black",
                          isWaived ? "text-slate-300 line-through" : "text-amber-600"
                        )}
                      >
                        {currency} {p.amount.toLocaleString()}
                      </p>
                    </td>
                    {/* Status */}
                    <td className="py-3 px-6 text-center">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-tight border",
                          s.cls
                        )}
                      >
                        {s.label}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-6 text-right">
                      {!isWaived ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={waivingId === p.id}
                          className={cn(
                            "h-8 text-[10px] font-black uppercase tracking-wider rounded-lg px-3 transition-all flex items-center gap-1.5 ml-auto",
                            confirmId === p.id
                              ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                              : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100 hover:text-slate-700"
                          )}
                          onClick={() => handleWaiveClick(p.id)}
                        >
                          {waivingId === p.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : confirmId === p.id ? (
                            "Confirm Waive?"
                          ) : (
                            <>
                              <Ban size={12} /> Waive
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="flex items-center gap-1.5 justify-end text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                          <CheckCircle2 size={12} /> {p.status === "WAIVED" ? "Waived" : "Paid"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="py-16 text-center text-xs text-slate-400 font-medium italic"
                >
                  {search || statusFilter !== "ALL"
                    ? "No penalties match your filters."
                    : "No outstanding penalties found in the system."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
