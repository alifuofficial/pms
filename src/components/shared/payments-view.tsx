import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CreditCard, Search, FileText, Filter, Calendar, User, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getSystemSettings } from "@/lib/actions/settings";
import { VerifyPaymentDialog } from "./verify-payment-dialog";
import { TenantPaymentDialog } from "./tenant-payment-dialog";

export async function PaymentsView({ 
  title = "Transactions", 
  tenantId,
  role = "ADMIN"
}: { 
  title?: string;
  tenantId?: string;
  role?: "ADMIN" | "TENANT" | "ACCOUNTANT" | "MANAGER";
}) {
  const settings = await getSystemSettings();
  
  const payments = await prisma.payment.findMany({
    where: tenantId ? { tenantId } : {},
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 font-medium">Verify and approve system-wide rental transactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Invoice # or Tenant..." className="pl-9 h-9 w-64 bg-white border-slate-200 rounded-lg text-sm" />
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 text-xs font-semibold">
            <Filter size={14} className="mr-2" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 text-xs font-semibold bg-white">
            <FileText size={14} className="mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-3 px-6">Tenant & Reference</th>
              <th className="py-3 px-6">Payment Period</th>
              <th className="py-3 px-6">Amount</th>
              <th className="py-3 px-6 text-center">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payments.length > 0 ? (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{p.tenant.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">INV-{p.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">Due: {new Date(p.dueDate).toLocaleDateString()}</p>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <p className="text-sm font-semibold text-slate-900">{settings.currency} {p.amount.toLocaleString()}</p>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-tight border",
                      p.status === "APPROVED" 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : p.status === "PENDING"
                        ? "bg-amber-50 text-amber-600 border-amber-100"
                        : "bg-red-50 text-red-600 border-red-100"
                    )}>
                      {p.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    {role === "TENANT" ? (
                      <TenantPaymentDialog payment={p} currency={settings.currency} />
                    ) : (
                      <VerifyPaymentDialog payment={p} currency={settings.currency} />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium italic">
                  No payment records found in the system.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
