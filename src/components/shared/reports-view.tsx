"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  Home, 
  Download,
  Calendar as CalendarIcon,
  Filter
} from "lucide-react";
import { formatSystemDate } from "@/lib/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReportsViewProps {
  metrics: {
    collectedRevenue: number;
    expectedRevenue: number;
    collectionRate: number;
    moveIns: number;
    moveOuts: number;
    occupancyRate: number;
    totalUnits: number;
    occupiedUnits: number;
    recentPayments: any[];
  };
  currency: string;
  calendarType: string;
  startDate: Date;
  endDate: Date;
}

export function ReportsView({ metrics, currency, calendarType, startDate, endDate }: ReportsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get("period") || "30days";

  const handlePeriodChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`?${params.toString()}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 print:bg-white print:p-0">
      
      {/* Header & Controls (Hidden in Print) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Financial & Operational Reports</h1>
          <p className="text-sm text-slate-500 font-medium">Aggregated metrics and performance tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={currentPeriod} onValueChange={(value) => handlePeriodChange(value || "30days")}>
            <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200 text-sm">
              <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days (Monthly)</SelectItem>
              <SelectItem value="quarterly">Last 90 Days (Quarterly)</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="yearly">Last 12 Months (Yearly)</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handlePrint} className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-none">
            <Download size={14} className="mr-2" /> Export / Print
          </Button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
        <h1 className="text-3xl font-black text-slate-900 uppercase">System Report</h1>
        <p className="text-sm font-bold text-slate-500 mt-1">
          Period: {formatSystemDate(startDate, calendarType)} - {formatSystemDate(endDate, calendarType)}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-none bg-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Revenue</p>
                <p className="text-2xl font-black text-slate-900">{currency} {metrics.collectedRevenue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BarChart3 size={20} />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-4">
              Expected: {currency} {metrics.expectedRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-none bg-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Collection Rate</p>
                <p className="text-2xl font-black text-slate-900">{metrics.collectionRate}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${metrics.collectionRate}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-none bg-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Occupancy Rate</p>
                <p className="text-2xl font-black text-slate-900">{metrics.occupancyRate}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Home size={20} />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-4">
              {metrics.occupiedUnits} out of {metrics.totalUnits} units occupied
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-none bg-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tenant Turnover</p>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xl font-black text-slate-900">{metrics.moveIns}</p>
                    <p className="text-[10px] font-bold text-emerald-600 flex items-center"><ArrowUpRight size={10} /> Move-ins</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900">{metrics.moveOuts}</p>
                    <p className="text-[10px] font-bold text-red-600 flex items-center"><ArrowDownRight size={10} /> Move-outs</p>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions / Activity Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-none print:border-none print:shadow-none">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Period Transactions</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Showing records for the selected timeframe.</p>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-200">
            <tr>
              <th className="py-4 px-6">Date</th>
              <th className="py-4 px-6">Tenant / Unit</th>
              <th className="py-4 px-6">Type</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {metrics.recentPayments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">No transactions in this period.</td>
              </tr>
            ) : (
              metrics.recentPayments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-medium text-slate-600">
                    {formatSystemDate(new Date(p.createdAt), calendarType)}
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-900">{p.tenant.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Unit {p.lease?.unit?.unitNumber}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      p.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                      p.status === "REJECTED" ? "bg-red-50 text-red-600 border-red-200" :
                      "bg-amber-50 text-amber-600 border-amber-200"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-black text-slate-900">
                    {currency} {p.amount.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
