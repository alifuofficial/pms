import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CreditCard, Search, FileText, Filter, Calendar, User, ArrowUpRight, Zap, Droplet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getSystemSettings } from "@/lib/actions/settings";
import { VerifyPaymentDialog } from "./verify-payment-dialog";
import { VerifyUtilityPaymentDialog } from "./verify-utility-payment-dialog";
import { TenantPaymentDialog } from "./tenant-payment-dialog";
import { Pagination } from "./pagination";

export async function PaymentsView({ 
  title = "Transactions", 
  tenantId,
  role = "ADMIN",
  searchParams,
}: { 
  title?: string;
  tenantId?: string;
  role?: "ADMIN" | "TENANT" | "ACCOUNTANT" | "MANAGER";
  searchParams?: any;
}) {
  const settings = await getSystemSettings();

  const paymentsWhere: any = tenantId ? { tenantId } : {};
  if (searchParams?.status) paymentsWhere.status = searchParams.status;

  const utilityWhere: any = tenantId ? { tenantId } : {};
  utilityWhere.status = { not: "UNPAID" };
  if (searchParams?.status) {
    if (searchParams.status === "APPROVED") {
      utilityWhere.status = "PAID";
    } else {
      utilityWhere.status = searchParams.status;
    }
  }

  const [allRentPayments, allUtilityBills] = await Promise.all([
    prisma.payment.findMany({
      where: paymentsWhere,
      include: { 
        tenant: true,
        lease: { include: { unit: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.utilityBill.findMany({
      where: utilityWhere,
      include: {
        tenant: true,
        lease: { include: { unit: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const mappedUtilities = allUtilityBills.map(u => ({
    id: u.id,
    leaseId: u.leaseId,
    tenantId: u.tenantId,
    amount: u.amount,
    status: u.status === "PAID" ? "APPROVED" : u.status,
    receiptUrl: u.receiptUrl,
    senderName: u.senderName,
    transactionId: u.transactionId,
    bankAccountId: u.bankAccountId,
    createdAt: u.createdAt,
    dueDate: u.dueDate,
    type: u.type,
    tenant: u.tenant,
    lease: u.lease,
    billingMonth: u.billingMonth,
    isUtility: true
  }));

  const combinedRecords = [...allRentPayments, ...mappedUtilities].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const page = parseInt(searchParams?.page || "1");
  const limit = parseInt(searchParams?.limit || "15");
  const skip = (page - 1) * limit;
  const totalCount = combinedRecords.length;
  const payments = combinedRecords.slice(skip, skip + limit);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 font-medium">
            Verify and approve system-wide rental transactions.
            <span className="ml-2 text-slate-400">({totalCount} total)</span>
          </p>
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
              <th className="py-3 px-6">Tenant &amp; Reference</th>
              <th className="py-3 px-6">Transaction Ref</th>
              <th className="py-3 px-6">Payment Period</th>
              <th className="py-3 px-6">Amount</th>
              <th className="py-3 px-6 text-center">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payments.length > 0 ? (
              (payments as any[]).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center border shrink-0",
                        p.isUtility 
                          ? p.type === "ELECTRICITY" 
                            ? "bg-yellow-50 text-yellow-600 border-yellow-100" 
                            : "bg-blue-50 text-blue-600 border-blue-100"
                          : "bg-indigo-50 text-indigo-600 border-indigo-100"
                      )}>
                        {p.isUtility 
                          ? p.type === "ELECTRICITY" ? <Zap size={16} /> : <Droplet size={16} />
                          : <User size={16} />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{p.tenant.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight flex items-center gap-1.5 flex-wrap">
                          <span>
                            {p.isUtility 
                              ? `${p.type === "ELECTRICITY" ? "ELECTRICITY" : "WATER"} - Unit ${p.lease?.unit?.unitNumber || "N/A"}`
                              : `INV-${p.id.slice(0, 8).toUpperCase()}`
                            }
                          </span>
                          {!p.isUtility && p.lease?.advanceBalance > 0 && (
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100/50">
                              ADVANCE: {settings.currency} {p.lease.advanceBalance.toLocaleString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <p className="text-xs font-mono font-semibold text-slate-700">
                      {(p as any).transactionId || <span className="text-slate-300 italic">—</span>}
                    </p>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        {p.isUtility 
                          ? p.billingMonth 
                          : new Date(p.dueDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                        }
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">Due: {new Date(p.dueDate).toLocaleDateString()}</p>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <p className="text-sm font-semibold text-slate-900">{settings.currency} {p.amount.toLocaleString()}</p>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex flex-col items-center gap-1">
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
                      {!p.isUtility && p.status === "APPROVED" && p.lease?.advanceBalance > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight bg-sky-50 text-sky-600 border border-sky-100">
                          Partial / Advance Applied
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-6 text-right">
                    {role === "TENANT" ? (
                      <TenantPaymentDialog payment={p} currency={settings.currency} />
                    ) : p.isUtility ? (
                      <VerifyUtilityPaymentDialog bill={p} currency={settings.currency} />
                    ) : (
                      <VerifyPaymentDialog payment={p} currency={settings.currency} />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium italic">
                  No payment records found in the system.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  );
}
