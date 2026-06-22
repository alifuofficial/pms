"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronLeft, ChevronRight, User, Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { waivePenalty } from "@/lib/actions/payments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PenaltyListProps {
  penalties: any[];
  currency: string;
}

export function PenaltyList({ penalties, currency }: PenaltyListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [waivingId, setWaivingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Reset/clamp current page if list size changes (e.g. items are added/removed/paid)
  useEffect(() => {
    const maxPage = Math.ceil(penalties.length / itemsPerPage) || 1;
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [penalties.length]);

  if (penalties.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-50 bg-slate-50/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-slate-400" />
            Penalty Arrears
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <p className="text-xs text-slate-400 font-medium">No outstanding penalties found.</p>
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil(penalties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = penalties.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleWaiveClick = (pId: string) => {
    if (confirmId === pId) {
      const item = penalties.find(pen => pen.id === pId);
      if (item) {
        executeWaive(item);
      }
      setConfirmId(null);
    } else {
      setConfirmId(pId);
      setTimeout(() => {
        setConfirmId(prev => prev === pId ? null : prev);
      }, 3000);
    }
  };

  const executeWaive = async (p: any) => {
    setWaivingId(p.id);
    try {
      const result = await waivePenalty({
        penaltyId: p.id,
        leaseId: p.lease.id,
        dueDate: p.dueDate,
        amount: p.amount
      });
      if (result.success) {
        toast.success(`Waived penalty of ${currency} ${p.amount.toLocaleString()} for Unit ${p.lease?.unit?.unitNumber}`);
      } else {
        toast.error(result.error || "Failed to waive penalty");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setWaivingId(null);
    }
  };

  return (
    <Card className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden flex flex-col h-full justify-between">
      <div>
        <CardHeader className="p-4 border-b border-slate-50 bg-slate-50/30 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <AlertCircle size={16} className="text-amber-500" />
            Penalty Arrears
          </CardTitle>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 font-black text-[9px] uppercase px-1.5">
            {penalties.length} Pending
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50 min-h-[350px]">
            {currentItems.map((p) => (
              <div key={p.id} className="p-4 hover:bg-slate-50/50 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                        {p.tenant.name}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">
                        Unit {p.lease?.unit?.unitNumber || "N/A"} • INV-{p.id.slice(0, 5).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-black text-amber-600 uppercase">
                        {currency} {p.amount.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                        Unpaid Fee
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={waivingId === p.id}
                      className={cn(
                        "h-8 text-[10px] font-black uppercase tracking-wider rounded-lg px-2.5 transition-all flex items-center gap-1 shrink-0",
                        confirmId === p.id 
                          ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" 
                          : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100 hover:text-slate-700"
                      )}
                      onClick={() => handleWaiveClick(p.id)}
                    >
                      {waivingId === p.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : confirmId === p.id ? (
                        "Confirm?"
                      ) : (
                        <>
                          <Ban size={12} /> Waive
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-50 bg-slate-50/20 flex items-center justify-between text-xs mt-auto">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Page {currentPage} of {totalPages} ({penalties.length} total)
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 rounded-md border-slate-200"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 rounded-md border-slate-200"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

