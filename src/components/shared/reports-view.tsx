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
  Filter,
  Zap,
  Droplet,
  TrendingDown,
  FileSpreadsheet,
  Printer
} from "lucide-react";
import { formatSystemDate, formatEthiopianMonthYear } from "@/lib/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Kenat from "kenat";
import { Badge } from "@/components/ui/badge";
import { RevenueChart } from "./dashboard-charts";

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
    advancePayments: any[];
    monthlyMetrics?: any[];
    expectedElectricity?: number;
    collectedElectricity?: number;
    expectedWater?: number;
    collectedWater?: number;
    uncollectedTenants: any[];
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

  const handleExportCSV = () => {
    const headers = ["Tenant Name", "Tenant Email", "Property", "Unit Number", `Rent Uncollected (${currency})`, `Penalties Uncollected (${currency})`, `Utilities Uncollected (${currency})`, `Total Outstanding (${currency})`];
    const rows = metrics.uncollectedTenants.map(t => [
      t.tenantName,
      t.tenantEmail,
      t.propertyName,
      t.unitNumber,
      t.rentUncollected,
      t.penaltiesUncollected,
      t.utilitiesUncollected,
      t.totalUncollected
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `uncollected_balances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      {/* Utility Revenue Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-none bg-white rounded-xl">
          <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-800">
                <Zap className="h-4 w-4 text-yellow-500 fill-yellow-100" />
                Electricity Revenues
              </CardTitle>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Metered Power Billing</p>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-slate-400 uppercase">Collected</span>
              <span className="text-2xl font-black text-slate-950">
                {currency} {(metrics.collectedElectricity || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-medium border-t border-slate-100 pt-3">
              <span className="text-slate-400">Expected Total:</span>
              <span className="text-slate-800 font-semibold">{currency} {(metrics.expectedElectricity || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-slate-400">Collection Rate:</span>
              <span className="text-slate-800 font-semibold">
                {metrics.expectedElectricity && metrics.expectedElectricity > 0 
                  ? Math.round(((metrics.collectedElectricity || 0) / metrics.expectedElectricity) * 100)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-yellow-500 h-full" 
                style={{ 
                  width: `${metrics.expectedElectricity && metrics.expectedElectricity > 0 
                    ? Math.min(100, Math.round(((metrics.collectedElectricity || 0) / metrics.expectedElectricity) * 100))
                    : 0}%` 
                }} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-none bg-white rounded-xl">
          <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-850">
                <Droplet className="h-4 w-4 text-blue-500 fill-blue-100" />
                Water Revenues
              </CardTitle>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Metered Flow Billing</p>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-slate-400 uppercase">Collected</span>
              <span className="text-2xl font-black text-slate-950">
                {currency} {(metrics.collectedWater || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-medium border-t border-slate-100 pt-3">
              <span className="text-slate-400">Expected Total:</span>
              <span className="text-slate-800 font-semibold">{currency} {(metrics.expectedWater || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-slate-400">Collection Rate:</span>
              <span className="text-slate-800 font-semibold">
                {metrics.expectedWater && metrics.expectedWater > 0 
                  ? Math.round(((metrics.collectedWater || 0) / metrics.expectedWater) * 100)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-50 h-full" 
                style={{ 
                  width: `${metrics.expectedWater && metrics.expectedWater > 0 
                    ? Math.min(100, Math.round(((metrics.collectedWater || 0) / metrics.expectedWater) * 100))
                    : 0}%` 
                }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart & Comparison Insights */}
      {metrics.monthlyMetrics && metrics.monthlyMetrics.length > 0 && (
        <Card className="border border-slate-200 shadow-none bg-white rounded-xl print:hidden">
          <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold">Monthly Collection Analysis (Expected vs Collected)</CardTitle>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Cohort Billing Cycle Comparisons</p>
            </div>
            <div className="text-indigo-600 font-bold text-xs bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
              {currentPeriod} Analysis
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <RevenueChart data={metrics.monthlyMetrics} />

            {(() => {
              const validMonths = metrics.monthlyMetrics.filter((m: any) => m.expected > 0);
              if (validMonths.length === 0) return null;
              const maxCollection = Math.max(...validMonths.map((m: any) => m.collected));
              const bestMonth = validMonths.find((m: any) => m.collected === maxCollection);
              if (!bestMonth || bestMonth.collected === 0) return null;

              return (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="font-semibold text-slate-700">
                      Collection Performance Comparison: <strong className="text-indigo-700 font-bold">{bestMonth.name}</strong> yielded the highest collections in this period with <strong className="text-indigo-700 font-bold">{bestMonth.collected.toLocaleString()} {currency}</strong> out of {bestMonth.expected.toLocaleString()} {currency} expected (<strong className="text-emerald-700 font-bold">{bestMonth.rate}% collected</strong>).
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold text-indigo-600 border-indigo-200 bg-indigo-50 uppercase whitespace-nowrap self-start sm:self-auto px-2 py-0.5 rounded shadow-none">
                    Peak Month
                  </Badge>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

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
              <th className="py-4 px-6">Coverage</th>
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
                    <p className="text-[10px] font-black text-indigo-600 uppercase">
                      {formatEthiopianMonthYear(new Date(p.dueDate))} 
                      ({new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(p.dueDate))})
                    </p>
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
      {/* Advance Collections Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-none print:mt-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-indigo-600">Advance Collections</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">List of tenants who paid for future months.</p>
          </div>
          <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 uppercase text-[10px]">
            {metrics.advancePayments.length} Records
          </Badge>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-200">
            <tr>
              <th className="py-4 px-6">Tenant</th>
              <th className="py-4 px-6">Property / Unit</th>
              <th className="py-4 px-6">Months Covered</th>
              <th className="py-4 px-6 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {metrics.advancePayments.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">No advance payments recorded in this period.</td>
              </tr>
            ) : (
              metrics.advancePayments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-900">{p.tenantName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{formatSystemDate(new Date(p.date), calendarType)}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs font-semibold text-slate-700">{p.propertyName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Unit {p.unitNumber}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                      {p.advanceUntil 
                        ? `Covers until ${formatSystemDate(new Date(p.advanceUntil), calendarType)}` 
                        : "Next Month Only"}
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

      {/* Tenants with Outstanding Balances Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-none print:mt-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between print:border-b-2">
          <div>
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-tight">Tenants with Outstanding Balances</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">List of tenants who have outstanding/unpaid rent, penalties, or utilities due up to {formatSystemDate(endDate, calendarType)}.</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-none"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" /> Export CSV (Excel)
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-none"
            >
              <Printer size={13} className="text-indigo-600" /> Export PDF (Print)
            </Button>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-200">
            <tr>
              <th className="py-4 px-6">Tenant</th>
              <th className="py-4 px-6">Property / Unit</th>
              <th className="py-4 px-6 text-right">Rent Due</th>
              <th className="py-4 px-6 text-right">Late Fees</th>
              <th className="py-4 px-6 text-right">Utilities</th>
              <th className="py-4 px-6 text-right">Total Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {metrics.uncollectedTenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-medium animate-pulse">No outstanding balances in this period.</td>
              </tr>
            ) : (
              metrics.uncollectedTenants.map(t => (
                <tr key={t.leaseId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-900">{t.tenantName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{t.tenantEmail}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs font-semibold text-slate-700">{t.propertyName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Unit {t.unitNumber}</p>
                  </td>
                  <td className="py-4 px-6 text-right text-slate-600 font-medium">
                    {t.rentUncollected > 0 ? `${currency} ${t.rentUncollected.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-4 px-6 text-right text-slate-600 font-medium">
                    {t.penaltiesUncollected > 0 ? `${currency} ${t.penaltiesUncollected.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-4 px-6 text-right text-slate-600 font-medium">
                    {t.utilitiesUncollected > 0 ? `${currency} ${t.utilitiesUncollected.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-4 px-6 text-right font-black text-red-600">
                    {currency} {t.totalUncollected.toLocaleString()}
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
