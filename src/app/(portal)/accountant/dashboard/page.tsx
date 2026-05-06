import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  FileText,
  Search,
  DollarSign,
  TrendingUp,
  History,
  Activity,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getSystemSettings, getEffectiveCalendar } from "@/lib/actions/settings";
import { RevenueChart } from "@/components/shared/dashboard-charts";
import { formatSystemDate, getSystemToday } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { VerifyPaymentDialog } from "@/components/shared/verify-payment-dialog";
import { auth } from "@/auth";
import Link from "next/link";
import { getRevenueAnalytics, getRecentAuditLogs } from "@/lib/actions/analytics";
import { formatDistanceToNow } from "date-fns";

export default async function AccountantDashboard() {
  const session = await auth();
  if (!session?.user) return null;

  // Get properties assigned to this accountant
  const assignedProperties = await prisma.property.findMany({
    where: { accountantId: session.user.id },
    select: { id: true }
  });
  const propertyIds = assignedProperties.map(p => p.id);
  const propertyFilter = propertyIds.length > 0 ? { lease: { unit: { propertyId: { in: propertyIds } } } } : { id: "none" };

  const [settings, calendarType, revenueData, auditLogs] = await Promise.all([
    getSystemSettings(),
    getEffectiveCalendar(),
    getRevenueAnalytics(6, propertyIds),
    getRecentAuditLogs(10)
  ]);
  
  const stats = {
    pendingPayments: await prisma.payment.count({ where: { status: "PENDING", ...propertyFilter } }),
    approvedPayments: await prisma.payment.count({ where: { status: "APPROVED", ...propertyFilter } }),
    totalRevenue: (await prisma.payment.aggregate({
      where: { status: "APPROVED", ...propertyFilter },
      _sum: { amount: true },
    }))._sum.amount || 0,
    expectedRevenue: (await prisma.payment.aggregate({
      where: propertyFilter,
      _sum: { amount: true },
    }))._sum.amount || 0,
  };

  const collectionRate = stats.expectedRevenue > 0 
    ? ((stats.totalRevenue / stats.expectedRevenue) * 100).toFixed(1) 
    : "0";

  const recentPayments = await prisma.payment.findMany({
    where: propertyFilter,
    take: 6,
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Financial Overview</h1>
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
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Find transaction..." 
              className="pl-9 h-9 w-48 bg-white border-slate-200 rounded-lg text-sm" 
            />
          </div>
          <Link href="/accountant/payments">
            <Button size="sm" className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-none font-medium">
              <Plus className="mr-2 h-3.5 w-3.5" /> New Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Total Revenue", value: `${settings.currency} ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-blue-600", trend: "Processed", trendColor: "text-blue-600" },
          { label: "Pending Approvals", value: stats.pendingPayments, icon: Clock, color: "text-amber-500", trend: "Needs Action", trendColor: "text-amber-600", link: true },
          { label: "Verified Receipts", value: stats.approvedPayments, icon: CheckCircle2, color: "text-emerald-500", trend: "System Synced", trendColor: "text-slate-400" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-all group shadow-sm">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              {stat.link ? (
                <Link href="/accountant/payments" className="text-[10px] font-bold uppercase text-amber-600 hover:underline">Review Now →</Link>
              ) : (
                <p className={cn("text-[10px] font-bold uppercase", stat.trendColor)}>{stat.trend}</p>
              )}
            </div>
            <div className={cn("p-3 rounded-xl bg-slate-50 group-hover:bg-white group-hover:scale-110 transition-all", stat.color.replace('text-', 'text-'))}>
              <stat.icon className={stat.color} size={24} strokeWidth={2} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <Card className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
            <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold">Collections Trend</CardTitle>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Revenue over time</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold border-slate-100">LIVE SYNC</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <RevenueChart data={revenueData} />
            </CardContent>
          </Card>

          {/* Recent Transactions Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <History size={16} className="text-slate-400" />
                Recent Transactions
              </h2>
              <Link href="/accountant/payments" className="text-xs text-blue-600 font-semibold hover:underline">
                View all
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5">Tenant</th>
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Amount</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-xs text-slate-400 italic">No transactions found.</td>
                    </tr>
                  ) : (
                    recentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-[10px] border border-slate-100 uppercase">
                              {p.tenant.name?.[0] || "T"}
                            </div>
                            <p className="text-sm font-semibold text-slate-900">{p.tenant.name || "Unnamed Tenant"}</p>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-xs font-medium text-slate-500">
                            {formatSystemDate(new Date(p.createdAt), calendarType)}
                          </p>
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-sm font-bold text-slate-900">
                            {settings.currency} {p.amount.toLocaleString()}
                          </p>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <VerifyPaymentDialog payment={p} currency={settings.currency} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Activity */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 px-1 flex items-center gap-2">
              <TrendingUp size={16} className="text-slate-400" />
              Financial Health
            </h2>
            <Card className="border border-slate-200 shadow-none bg-slate-50 rounded-xl p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collection Rate</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-black text-slate-900">{collectionRate}%</p>
                  <p className="text-[10px] font-bold text-emerald-600 mb-1">Target 100%</p>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${collectionRate}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                {Number(collectionRate) > 90 ? "Excellent collection performance." : "Requires attention to collections."}
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 px-1 flex items-center gap-2">
              <Activity size={16} className="text-slate-400" />
              Live Feed
            </h2>
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 italic">No recent activity</p>
                </div>
              ) : (
                auditLogs.map((item, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 flex gap-3 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Activity size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.action}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">
                        By {item.user.name || "System"}
                      </p>
                      <p className="text-[9px] text-blue-600 font-bold mt-1 uppercase tracking-tighter">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link href="/accountant/payments">
              <Button variant="outline" className="w-full border-slate-200 text-slate-500 text-xs font-bold h-10 rounded-xl hover:bg-slate-50 mt-3">
                Full Transaction History
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
