"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  Clock, 
  ShieldCheck, 
  Activity, 
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSystemDate } from "@/lib/calendar";
import { 
  getProperties, 
  getTenants, 
  getPayments, 
  getUnits, 
  getAuditLogs, 
  getSettings, 
  resetDemoData, 
  Property, 
  Unit, 
  Tenant, 
  Payment, 
  AuditLog, 
  Settings 
} from "@/lib/demo-store";

export default function DemoDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<Settings>({ currency: "ETB", lateFeeEnabled: true, lateFeePercentage: 5, warningFeePercentage: 10 });

  useEffect(() => {
    setIsMounted(true);
    // Trigger initial seed if needed
    setProperties(getProperties());
    setUnits(getUnits());
    setTenants(getTenants());
    setPayments(getPayments());
    setAuditLogs(getAuditLogs());
    setSettings(getSettings());
  }, []);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all sandbox data?")) {
      resetDemoData();
      setProperties(getProperties());
      setUnits(getUnits());
      setTenants(getTenants());
      setPayments(getPayments());
      setAuditLogs(getAuditLogs());
      setSettings(getSettings());
    }
  };

  if (!isMounted) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const totalRevenue = payments
    .filter(p => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingApprovalsCount = payments.filter(p => p.status === "PENDING").length;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Banner / Warn */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-3 items-start md:items-center">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Demo Sandbox Active</h3>
            <p className="text-xs text-amber-700 font-medium">
              Persisted in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">localStorage</code>. Live system remains unaffected.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 h-9 rounded-lg font-medium shadow-none" onClick={handleReset}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Reset Sandbox
          </Button>
          <Link href="/admin/dashboard">
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-9 rounded-lg font-medium shadow-none">
              Switch to Live Mode <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin Dashboard (Demo)</h1>
          <div className="flex items-center gap-2 overflow-hidden">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {formatSystemDate(new Date(), "GREGORIAN")}
            </p>
            <span className="text-slate-300 text-[10px]">|</span>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              {formatSystemDate(new Date(), "ETHIOPIAN")}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Properties", value: properties.length, icon: Building2, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Tenants", value: tenants.length, icon: Users, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Pending", value: pendingApprovalsCount, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Revenue", value: `${settings.currency} ${totalRevenue.toLocaleString()}`, icon: ShieldCheck, color: "text-indigo-500", bg: "bg-indigo-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
            </div>
            <div className={cn("p-2 rounded-lg", stat.bg)}>
              <stat.icon className={cn("h-6 w-6", stat.color)} strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      {/* Analytics & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-200 shadow-none bg-white rounded-xl">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold">Simulated Revenue Trend</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Monthly Collections</CardDescription>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-100 bg-emerald-50 font-bold text-[10px] uppercase">Simulated</Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="h-48 w-full bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-around px-6 pointer-events-none">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-full w-px border-l border-dashed border-slate-200" />)}
                </div>
                <div className="w-full h-32 flex items-end justify-between px-4 z-10">
                  {[
                    { m: "Yekatit", val: 22100 },
                    { m: "Megabit", val: 30416 },
                    { m: "Miyazia", val: 8316 },
                    { m: "Ginbot", val: 68510 },
                    { m: "Sene", val: totalRevenue > 120000 ? 55000 : 0 }
                  ].map((item, idx) => {
                    const maxVal = 100000;
                    const heightPercent = Math.max(10, Math.min(100, (item.val / maxVal) * 100));
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 w-16 group">
                        <div className="text-[8px] font-bold text-slate-600 bg-white border px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-8">
                          {item.val.toLocaleString()}
                        </div>
                        <div 
                          style={{ height: `${heightPercent}%` }} 
                          className="w-10 rounded-t-md bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 transition-all cursor-pointer shadow-sm"
                        />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.m}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 shrink-0" />
                <p className="text-xs text-slate-700">
                  This chart aggregates simulated payments. Add mock payment records under the **Payments** tab to see it reflect.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-800">Sandbox Activity Log</h2>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400">No activity recorded yet</p>
              </div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="bg-white p-3 rounded-lg border border-slate-100 flex gap-3 hover:border-slate-200 transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <Activity size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{log.action}</p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
