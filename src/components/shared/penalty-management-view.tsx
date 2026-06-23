"use client";

import { useState } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  User,
  X,
  CalendarDays,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

interface WaiveModalState {
  /** The clicked penalty row (used as anchor for the tenant) */
  anchor: PenaltyItem;
  /** All active (unpaid/partial) penalty months for this tenant, oldest-first */
  activePenalties: PenaltyItem[];
  /** How many months admin wants to waive */
  monthsInput: string;
}

interface PenaltyManagementViewProps {
  penalties: PenaltyItem[];
  currency: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  UNPAID: { label: "Unpaid",  cls: "bg-red-50 text-red-600 border-red-100" },
  PARTIAL: { label: "Partial", cls: "bg-amber-50 text-amber-600 border-amber-100" },
  PAID:    { label: "Paid",    cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  WAIVED:  { label: "Waived",  cls: "bg-slate-50 text-slate-400 border-slate-100" },
};

function fmtMonth(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/* ─── Waive Modal ─────────────────────────────────────────────────────────── */
function WaiveModal({
  modal,
  currency,
  onClose,
  onConfirm,
  isWaiving,
}: {
  modal: WaiveModalState;
  currency: string;
  onClose: () => void;
  onConfirm: (toWaive: PenaltyItem[]) => void;
  isWaiving: boolean;
}) {
  const { anchor, activePenalties, monthsInput } = modal;
  const [months, setMonths] = useState(monthsInput);

  const max = activePenalties.length;
  const parsed = parseInt(months, 10);
  const valid = !isNaN(parsed) && parsed >= 1 && parsed <= max;
  const toWaive = valid ? activePenalties.slice(0, parsed) : [];
  const totalWaived = toWaive.reduce((s, p) => s + p.amount, 0);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <Ban size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Waive Penalty Months</h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {anchor.tenant.name} · Unit {anchor.lease?.unit?.unitNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Info pill */}
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <TriangleAlert size={14} className="text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-700">
              This tenant has{" "}
              <span className="font-black">{max} outstanding penalty month{max !== 1 ? "s" : ""}</span>.
              Choose how many to waive.
            </p>
          </div>

          {/* All months list */}
          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50">
            {activePenalties.map((p, i) => {
              const willWaive = valid && i < parsed;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 text-xs transition-colors",
                    willWaive
                      ? "bg-red-50/60"
                      : "bg-white"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays
                      size={13}
                      className={willWaive ? "text-red-400" : "text-slate-300"}
                    />
                    <span
                      className={cn(
                        "font-semibold",
                        willWaive ? "text-red-700" : "text-slate-500"
                      )}
                    >
                      {fmtMonth(p.dueDate)}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
                      Month {i + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-black",
                        willWaive ? "text-red-600" : "text-slate-400"
                      )}
                    >
                      {currency} {p.amount.toLocaleString()}
                    </span>
                    {willWaive && (
                      <span className="text-[9px] font-black uppercase bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                        WAIVE
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Number of months to waive
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={max}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder={`1 – ${max}`}
                className={cn(
                  "h-10 text-sm font-semibold border rounded-lg focus-visible:ring-2",
                  months && !valid
                    ? "border-red-300 focus-visible:ring-red-400/30"
                    : "border-slate-200 focus-visible:ring-indigo-400/30"
                )}
              />
              <span className="text-xs text-slate-400 font-medium shrink-0">
                of {max} months
              </span>
            </div>
            {months && !valid && (
              <p className="text-[11px] text-red-500 font-medium">
                Please enter a number between 1 and {max}.
              </p>
            )}
          </div>

          {/* Summary */}
          {valid && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-1">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Waive summary
              </p>
              <p className="text-sm font-semibold text-slate-700">
                Waiving{" "}
                <span className="font-black text-slate-900">
                  {parsed} month{parsed !== 1 ? "s" : ""}
                </span>{" "}
                ·{" "}
                <span className="text-red-600 font-black">
                  {currency} {totalWaived.toLocaleString()}
                </span>{" "}
                forgiven
              </p>
              <p className="text-[11px] text-slate-400">
                From {fmtMonth(toWaive[0].dueDate)}
                {parsed > 1 && ` → ${fmtMonth(toWaive[parsed - 1].dueDate)}`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold border-slate-200 rounded-lg"
            disabled={isWaiving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid || isWaiving}
            onClick={() => onConfirm(toWaive)}
            className="h-9 px-5 text-xs font-black rounded-lg bg-red-600 hover:bg-red-700 text-white border-0 flex items-center gap-1.5"
          >
            {isWaiving ? (
              <><Loader2 size={13} className="animate-spin" /> Waiving…</>
            ) : (
              <><Ban size={13} /> Waive {valid ? parsed : ""} Month{parsed !== 1 ? "s" : ""}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main View ───────────────────────────────────────────────────────────── */
export function PenaltyManagementView({
  penalties: initialPenalties,
  currency,
}: PenaltyManagementViewProps) {
  const [penalties, setPenalties] = useState<PenaltyItem[]>(initialPenalties);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [waiveModal, setWaiveModal] = useState<WaiveModalState | null>(null);
  const [isWaiving, setIsWaiving] = useState(false);
  // For single-penalty confirm (no modal needed)
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [waivingId, setWaivingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [prevSearch, setPrevSearch] = useState("");
  const [prevFilter, setPrevFilter] = useState("ALL");
  if (search !== prevSearch || statusFilter !== prevFilter) {
    setPrevSearch(search);
    setPrevFilter(statusFilter);
    setCurrentPage(1);
  }

  /* ── filter ── */
  const filtered = penalties.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.tenant.name.toLowerCase().includes(q) ||
      p.lease?.unit?.unitNumber?.toLowerCase().includes(q) ||
      p.lease?.unit?.property?.name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const displayedPenalties = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* ── open waive flow ── */
  const handleWaiveClick = (p: PenaltyItem) => {
    // Gather active (unpaid/partial) months for THIS tenant's lease, oldest-first
    const activePenalties = penalties
      .filter(
        (pen) =>
          pen.tenant.id === p.tenant.id &&
          pen.lease.id === p.lease.id &&
          (pen.status === "UNPAID" || pen.status === "PARTIAL")
      )
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

    if (activePenalties.length <= 1) {
      // Single-month: classic two-click confirm on the row
      if (confirmId === p.id) {
        executeSingleWaive(p);
        setConfirmId(null);
      } else {
        setConfirmId(p.id);
        setTimeout(() => {
          setConfirmId((prev) => (prev === p.id ? null : prev));
        }, 3000);
      }
    } else {
      // Multiple months: open modal
      setConfirmId(null);
      setWaiveModal({
        anchor: p,
        activePenalties,
        monthsInput: "1",
      });
    }
  };

  /* ── single waive (no modal) ── */
  const executeSingleWaive = async (p: PenaltyItem) => {
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
          `Waived ${currency} ${p.amount.toLocaleString()} for Unit ${p.lease?.unit?.unitNumber}`
        );
        setPenalties((prev) =>
          prev.map((pen) => (pen.id === p.id ? { ...pen, status: "WAIVED" } : pen))
        );
      } else {
        toast.error(result.error || "Failed to waive penalty");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setWaivingId(null);
    }
  };

  /* ── multi-month waive (from modal) ── */
  const executeMultiWaive = async (toWaive: PenaltyItem[]) => {
    setIsWaiving(true);
    const waivedIds: string[] = [];
    let failCount = 0;

    for (const p of toWaive) {
      try {
        const result = await waivePenalty({
          penaltyId: p.id,
          leaseId: p.lease.id,
          dueDate: p.dueDate,
          amount: p.amount,
        });
        if (result.success) {
          waivedIds.push(p.id);
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsWaiving(false);
    setWaiveModal(null);

    if (waivedIds.length > 0) {
      const totalAmt = toWaive
        .filter((p) => waivedIds.includes(p.id))
        .reduce((s, p) => s + p.amount, 0);
      toast.success(
        `Waived ${waivedIds.length} month${waivedIds.length !== 1 ? "s" : ""} · ${currency} ${totalAmt.toLocaleString()} forgiven`
      );
      setPenalties((prev) =>
        prev.map((pen) =>
          waivedIds.includes(pen.id) ? { ...pen, status: "WAIVED" } : pen
        )
      );
    }
    if (failCount > 0) {
      toast.error(`${failCount} month${failCount !== 1 ? "s" : ""} could not be waived.`);
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
    <>
      {/* ── Waive Modal ── */}
      {waiveModal && (
        <WaiveModal
          modal={waiveModal}
          currency={currency}
          onClose={() => !isWaiving && setWaiveModal(null)}
          onConfirm={executeMultiWaive}
          isWaiving={isWaiving}
        />
      )}

      <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Penalty Management
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Review, track, and waive outstanding late-fee penalties across all units.
              <span className="ml-2 text-slate-400">({penalties.length} total)</span>
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
            { label: "Total Penalties", value: stats.total,   color: "text-slate-700", bg: "bg-slate-50" },
            { label: "Unpaid",          value: stats.unpaid,  color: "text-red-600",   bg: "bg-red-50"   },
            { label: "Partial",         value: stats.partial, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Waived",          value: stats.waived,  color: "text-slate-400", bg: "bg-slate-50" },
          ].map((s) => (
            <div
              key={s.label}
              className={cn("rounded-xl border border-slate-100 p-4 space-y-1", s.bg)}
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
              {displayedPenalties.length > 0 ? (
                displayedPenalties.map((p) => {
                  const s = STATUS_LABELS[p.status] ?? STATUS_LABELS["UNPAID"];
                  const isWaived = p.status === "WAIVED" || p.status === "PAID";

                  // Count active months for this tenant/lease to hint in the button
                  const activeCount = penalties.filter(
                    (pen) =>
                      pen.tenant.id === p.tenant.id &&
                      pen.lease.id === p.lease.id &&
                      (pen.status === "UNPAID" || pen.status === "PARTIAL")
                  ).length;

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
                            <p className="text-sm font-semibold text-slate-900">{p.tenant.name}</p>
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
                          {fmtMonth(p.dueDate)}
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
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-tight border",
                              s.cls
                            )}
                          >
                            {s.label}
                          </span>
                          {/* Badge showing how many months this tenant owes */}
                          {!isWaived && activeCount > 1 && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded">
                              {activeCount} months owed
                            </span>
                          )}
                        </div>
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
                            onClick={() => handleWaiveClick(p)}
                          >
                            {waivingId === p.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : confirmId === p.id ? (
                              "Confirm?"
                            ) : (
                              <>
                                <Ban size={12} />
                                {activeCount > 1 ? "Waive months…" : "Waive"}
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="flex items-center gap-1.5 justify-end text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                            <CheckCircle2 size={12} />
                            {p.status === "WAIVED" ? "Waived" : "Paid"}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Page {currentPage} of {totalPages} <span className="ml-1 text-slate-300">({totalItems} total)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg border-slate-200"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg border-slate-200"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg border-slate-200"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg border-slate-200"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
