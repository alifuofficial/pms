import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Home, 
  Calendar, 
  CreditCard, 
  FileText, 
  ArrowUpRight, 
  Search, 
  Plus, 
  Activity, 
  Clock, 
  Building2, 
  ChevronRight,
  ShieldCheck,
  Receipt
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSystemToday, formatSystemDate } from "@/lib/calendar";
import { RevenueChart } from "@/components/shared/dashboard-charts";
import Link from "next/link";
import { getEffectiveCalendar } from "@/lib/actions/settings";
import { getTenantRevenueAnalytics } from "@/lib/actions/analytics";
import { formatDistanceToNow } from "date-fns";

export default async function TenantDashboard() {
  const session = await auth();
  const userId = session?.user?.id;
  
  if (!userId) {
    return <div>Unauthorized</div>;
  }

  const [calendarType, revenueData, lease, recentPayments, invoices, totalPaid, activityLogs] = await Promise.all([
    getEffectiveCalendar(),
    getTenantRevenueAnalytics(userId),
    prisma.lease.findFirst({
      where: { tenantId: userId, status: "ACTIVE" },
      include: { unit: { include: { property: true } } },
    }),
    prisma.payment.findMany({
      where: { tenantId: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { tenantId: userId, status: "PENDING" },
    }),
    prisma.payment.aggregate({
      where: { tenantId: userId, status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.auditLog.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Institutional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Residential Dashboard</h1>
          <div className="flex items-center gap-2 overflow-hidden">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {getSystemToday("GREGORIAN")}
            </p>
            <span className="text-slate-300 text-[10px]">|</span>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              {getSystemToday("ETHIOPIAN")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Link href="/tenant/payments">
             <Button size="sm" className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-none font-medium px-4">
               <CreditCard className="mr-2 h-3.5 w-3.5" /> Pay Rent
             </Button>
           </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Monthly Rent", value: lease ? `${lease.unit.rentAmount.toLocaleString()} ETB` : "N/A", icon: Building2, color: "text-blue-500" },
          { label: "Pending Dues", value: invoices.length > 0 ? `${invoices.length} Items` : "Clear", icon: Receipt, color: "text-amber-500" },
          { label: "Total Paid", value: `${(totalPaid._sum.amount || 0).toLocaleString()} ETB`, icon: ShieldCheck, color: "text-emerald-500" },
          { label: "Lease Status", value: lease ? "Active" : "None", icon: Clock, color: "text-indigo-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50">
              <stat.icon className={cn("h-5 w-5", stat.color)} strokeWidth={2} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Analytics & Lease Details */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
             <CardHeader className="p-5 border-b border-slate-50">
                <CardTitle className="text-sm font-semibold text-slate-900">Payment History</CardTitle>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Your transaction performance over time</p>
             </CardHeader>
             <CardContent className="p-5">
                <RevenueChart data={revenueData} />
             </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 px-1 uppercase tracking-tight">Recent Payments</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
               <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5">Transaction</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-10 text-center text-xs text-slate-400 italic">No payment history found.</td>
                      </tr>
                    ) : (
                      recentPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                <CreditCard size={14} className="text-slate-400" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{payment.amount.toLocaleString()} ETB</p>
                                <p className="text-[10px] text-slate-400 font-medium lowercase tracking-tight">{payment.type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                              payment.status === "APPROVED" ? "bg-emerald-50 text-emerald-600" : 
                              payment.status === "PENDING" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                            )}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right text-[10px] font-bold text-slate-400">
                            {formatSystemDate(new Date(payment.createdAt), calendarType)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          <Card className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden shadow-sm">
             <div className="h-1.5 bg-blue-600 w-full" />
             <CardHeader className="p-5 pb-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Lease Overview</CardTitle>
             </CardHeader>
             <CardContent className="p-5 space-y-4">
                {lease ? (
                  <>
                    <div className="space-y-1">
                       <h3 className="text-base font-bold text-slate-900">{lease.unit.property.name}</h3>
                       <p className="text-xs font-medium text-slate-500">Unit {lease.unit.unitNumber}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-50 space-y-3">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Lease Ends</span>
                          <span className="text-[11px] font-bold text-slate-900">{formatSystemDate(new Date(lease.endDate), calendarType)}</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-tighter">{lease.status}</span>
                       </div>
                    </div>
                    <Link href="/tenant/leases" className="block pt-2">
                       <Button variant="outline" className="w-full h-9 rounded-lg text-xs font-bold border-slate-200 text-slate-600">
                          View Documents
                       </Button>
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-400 font-medium italic">No active lease found.</p>
                  </div>
                )}
             </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 px-1 uppercase tracking-tight">Recent Activity</h2>
            <div className="space-y-2">
              {activityLogs.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-xs text-slate-400 italic">No activity yet</p>
                </div>
              ) : (
                activityLogs.map((act, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 flex gap-3 hover:border-slate-200 transition-all cursor-pointer shadow-sm">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-50 text-slate-400")}>
                      <Activity size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{act.action}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
