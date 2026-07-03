"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSystemDate } from "@/lib/calendar";
import { Search, FileText, Download, CheckCircle2, Clock, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Pagination } from "./pagination";

interface InvoicesViewProps {
  payments: any[];
  currency: string;
  calendarType: string;
  role: string;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
}

export function InvoicesView({ payments, currency, calendarType, role, currentPage = 1, totalPages = 1, totalCount }: InvoicesViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Invoices & Billing</h1>
          <p className="text-sm text-slate-500 font-medium">Manage and print financial records.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search invoice..." className="pl-9 h-9 w-64 bg-white border-slate-200 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-4 px-6">Invoice ID</th>
              <th className="py-4 px-6">Billed To</th>
              <th className="py-4 px-6">Issue Date</th>
              <th className="py-4 px-6">Amount</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 text-sm font-medium">
                  No invoices found.
                </td>
              </tr>
            )}
            {(payments as any[]).map((p) => {
              const invoiceId = p.isUtility 
                ? `${p.type === "ELECTRICITY" ? "ELEC" : "WAT"}-${p.id.slice(0, 8).toUpperCase()}`
                : `INV-${p.id.slice(0, 8).toUpperCase()}`;
              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-white transition-colors border border-slate-200 group-hover:border-slate-300">
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{invoiceId}</p>
                        <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                          Unit {p.lease?.unit?.unitNumber || "N/A"} {p.isUtility && `(${p.billingMonth})`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-semibold text-slate-800">{p.tenant.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{p.tenant.email}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-medium text-slate-700">
                      {formatSystemDate(new Date(p.createdAt), calendarType)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Due: {formatSystemDate(new Date(p.dueDate), calendarType)}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-black text-slate-900">{currency} {p.amount.toLocaleString()}</p>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider",
                      p.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                      p.status === "REJECTED" ? "bg-red-50 text-red-600 border-red-200" : 
                      "bg-amber-50 text-amber-600 border-amber-200"
                    )}>
                      {p.status === "APPROVED" ? "Paid" : p.status === "REJECTED" ? "Voided" : "Unpaid"}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link href={`/invoice/${p.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-semibold shadow-none border-slate-200 hover:bg-slate-100">
                        <Printer size={14} className="mr-2" /> Print
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination totalPages={totalPages} currentPage={currentPage} />
    </div>
  );
}
