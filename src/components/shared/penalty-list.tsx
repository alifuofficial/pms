"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PenaltyListProps {
  penalties: any[];
  currency: string;
}

export function PenaltyList({ penalties, currency }: PenaltyListProps) {
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

  return (
    <Card className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
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
        <div className="divide-y divide-slate-50">
          {penalties.map((p) => (
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
                <div className="text-right">
                  <p className="text-xs font-black text-amber-600 uppercase">
                    {currency} {p.amount.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                    Unpaid Fee
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
