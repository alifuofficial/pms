import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  Clock, 
  Search, 
  Plus,
  Activity,
  ChevronRight,
  ArrowRight,
  TrendingDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { OccupancyChart, PaymentTypeChart, RevenueAnalyticsTabs } from "@/components/shared/dashboard-charts";
import { PenaltyList } from "@/components/shared/penalty-list";
import { Badge } from "@/components/ui/badge";
import { getSystemToday } from "@/lib/calendar";
import { getRevenueAnalytics, getOccupancyAnalytics, getRecentAuditLogs, getPaymentTypeBreakdown, getEthiopianRevenueAnalytics } from "@/lib/actions/analytics";
import { getPendingPenalties } from "@/lib/actions/penalties";
import { getLeaseUncollectedBalance } from "@/lib/arrears";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
  
  const [
    revenueData,
    occupancyData,
    paymentBreakdown,
    auditLogs,
    ethiopianRevenueData,
    stats
  ] = await Promise.all([
    getRevenueAnalytics(),
    getOccupancyAnalytics(),
    getPaymentTypeBreakdown(),
    getRecentAuditLogs(10),
    getEthiopianRevenueAnalytics(),
    (async () => ({
      totalProperties: await prisma.property.count(),
      activeTenants: await prisma.user.count({ where: { role: "TENANT" } }),
      pendingApprovals: (await prisma.payment.count({ where: { status: "PENDING" } })) + 
                        (await prisma.utilityBill.count({ where: { status: "PENDING" } })),
      totalRevenue: await (async () => {
        const rent = await prisma.payment.aggregate({
          where: { status: "APPROVED" },
          _sum: { amount: true }
        });
        const penalty = await prisma.penalty.aggregate({
          where: { status: "PAID" },
          _sum: { paidAmount: true }
        });
        const utility = await prisma.utilityBill.aggregate({
          where: { status: "PAID" },
          _sum: { amount: true }
        });
        return (rent._sum.amount || 0) + (penalty._sum.paidAmount || 0) + (utility._sum.amount || 0);
      })(),
      uncollectedBalance: await (async () => {
        const activeLeases = await prisma.lease.findMany({
          where: { status: "ACTIVE" },
          include: {
            unit: true,
            payments: true,
            penalties: true,
            utilityBills: true,
          }
        });
        let total = 0;
        for (const lease of activeLeases) {
          const { totalUncollected } = getLeaseUncollectedBalance(lease, settings);
          total += totalUncollected;
        }
        return total;
      })()
    }))()
  ]);

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const pendingPenalties = await getPendingPenalties();

  const maxCollection = revenueData.length > 0 ? Math.max(...revenueData.map(d => d.collected || 0)) : 0;
  const bestMonth = revenueData.find(d => d.collected === maxCollection && d.collected > 0);

  const isEthiopian = settings?.calendarType === "ETHIOPIAN";
  const monthlyAnalytics = isEthiopian 
    ? await getEthiopianRevenueAnalytics(2)
    : await getRevenueAnalytics(2);

  const currentMonthData = (monthlyAnalytics[1] || { name: "Current Month", expected: 0, collected: 0, uncollected: 0 }) as any;
  const previousMonthData = (monthlyAnalytics[0] || { name: "Previous Month", expected: 0, collected: 0, uncollected: 0 }) as any;

  const currentMonthExpected = currentMonthData.expected;
  const currentMonthUncollected = currentMonthData.uncollected !== undefined 
    ? currentMonthData.uncollected 
    : Math.max(0, currentMonthData.expected - currentMonthData.collected);

  const previousMonthExpected = previousMonthData.expected;
  const previousMonthUncollected = previousMonthData.uncollected !== undefined 
    ? previousMonthData.uncollected 
    : Math.max(0, previousMonthData.expected - previousMonthData.collected);

  const totalExpected = stats.totalRevenue + stats.uncollectedBalance;
  const collectionRate = totalExpected > 0 ? Math.round((stats.totalRevenue / totalExpected) * 100) : 0;
  const currency = settings?.currency || "USD";

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10 px-4 sm:px-6">
      {/* Demo Sandbox Alert Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex gap-3 items-start md:items-center">
          <div className="bg-blue-600/10 p-2 rounded-lg text-blue-600">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Want to test features without touching the real database?</h3>
            <p className="text-xs text-slate-500 font-medium font-sans">Use the Demo Sandbox to simulate properties, tenants, ledger entries, and late fee calculations in a safe environment.</p>
          </div>
        </div>
        <Link href="/admin/demo/dashboard">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-9 rounded-lg font-semibold shadow-sm hover:shadow transition-all duration-200 self-start md:self-auto uppercase text-[10px] tracking-wider shrink-0">
            Switch to Demo Sandbox <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back! Here's an overview of your rental operations today.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Quick search..." 
              className="pl-9 h-9 w-full md:w-48 bg-white border-slate-200 rounded-lg text-xs font-medium focus-visible:ring-indigo-500" 
            />
          </div>
          <Link href="/admin/properties/new">
            <Button size="sm" className="h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold text-xs transition-colors shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Structural Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns (Col-Span-2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Financial Summary Hero Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-slate-800 animate-in slide-in-from-top-4 duration-500">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-blue-500 rounded-full blur-3xl opacity-10 pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Financial Overview</p>
                </div>
                <p className="text-xs text-slate-400">Total collected across rent, penalties, and utilities.</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold text-blue-300 uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {getSystemToday("GREGORIAN")}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {getSystemToday("ETHIOPIAN")}
                  </span>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue Collected</p>
                <p className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-1">
                  {currency} {stats.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 relative">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Expected</p>
                <p className="text-xl font-bold text-white">{currency} {totalExpected.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  Uncollected Balance <TrendingDown className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                </p>
                <p className="text-xl font-bold text-rose-400">{currency} {stats.uncollectedBalance.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Collection Rate</span>
                  <span className="text-emerald-400 font-bold">{collectionRate}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Monthly Breakdowns (Current vs Previous) */}
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Previous Month */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1.5">
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={11} className="text-indigo-400" /> {previousMonthData.name} (Previous Month)
                </p>
                <div className="grid grid-cols-2 gap-2 font-medium">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase">Expected</span>
                    <p className="text-sm font-bold text-white">{currency} {previousMonthExpected.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase">Uncollected</span>
                    <p className="text-sm font-bold text-rose-400">{currency} {previousMonthUncollected.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Current Month */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1.5">
                <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity size={11} className="text-emerald-400" /> {currentMonthData.name} (Current Month)
                </p>
                <div className="grid grid-cols-2 gap-2 font-medium">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase">Expected</span>
                    <p className="text-sm font-bold text-white">{currency} {currentMonthExpected.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase">Uncollected</span>
                    <p className="text-sm font-bold text-rose-400">{currency} {currentMonthUncollected.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Tabs Card (Gregorian & Ethiopian Switcher) */}
          <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
              <RevenueAnalyticsTabs 
                gregorianData={revenueData} 
                ethiopianData={ethiopianRevenueData} 
                currency={currency}
                bestMonth={bestMonth}
              />
            </CardContent>
          </Card>

          {/* Occupancy and Payment Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Occupancy Chart */}
            <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
              <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold text-slate-900">Occupancy Rate</CardTitle>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Real Monthly Utilization</p>
                </div>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 font-bold text-[9px] uppercase tracking-wider border border-indigo-100/50">
                  Lease Sync
                </Badge>
              </CardHeader>
              <CardContent className="p-5">
                <OccupancyChart data={occupancyData} />
              </CardContent>
            </Card>

            {/* Payment Breakdown Pie */}
            <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
              <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold text-slate-900">Payment Breakdown</CardTitle>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Transaction Categories</p>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-100 bg-blue-50 font-bold text-[9px] uppercase tracking-wider">
                  Type
                </Badge>
              </CardHeader>
              <CardContent className="p-5">
                <PaymentTypeChart data={paymentBreakdown} />
              </CardContent>
            </Card>

          </div>

        </div>

        {/* Right Column (Col-Span-1) */}
        <div className="space-y-6">
          
          {/* Operational Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
            
            {/* Properties */}
            <Link href="/admin/properties" className="block group">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group-hover:-translate-y-0.5">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Properties</p>
                  <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.totalProperties}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Manage Properties <ChevronRight className="h-3 w-3" />
                  </p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Building2 className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
            </Link>

            {/* Active Tenants */}
            <Link href="/admin/tenants" className="block group">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group-hover:-translate-y-0.5">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Tenants</p>
                  <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.activeTenants}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Tenants <ChevronRight className="h-3 w-3" />
                  </p>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                  <Users className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
            </Link>

            {/* Pending Approvals */}
            <Link href="/admin/approvals" className="block group">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-amber-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group-hover:-translate-y-0.5">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</p>
                  <p className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1.5">
                    {stats.pendingApprovals}
                    {stats.pendingApprovals > 0 && (
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </p>
                  <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Review Queue <ChevronRight className="h-3 w-3" />
                  </p>
                </div>
                <div className="bg-amber-50 text-amber-600 p-3 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                  <Clock className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
            </Link>

          </div>

          {/* Pending Penalties List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-1 shadow-sm hover:shadow-md transition-shadow duration-300">
            <PenaltyList penalties={pendingPenalties} currency={currency} />
          </div>

        </div>

      </div>

      {/* Bottom Grid: Recent Users & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Users Table (Col-Span-2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-slate-955">Recent Registrations</h2>
              <p className="text-xs text-slate-400 font-medium font-sans">Newly created user accounts on the platform</p>
            </div>
            <Link href="/admin/settings?tab=users">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5">
                View all users <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/75 border-b border-slate-150 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-6">User Account</th>
                    <th className="py-3.5 px-6">Assigned Role</th>
                    <th className="py-3.5 px-6 text-right">System Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100/80 border border-slate-200/40 flex items-center justify-center font-bold text-slate-600 text-xs shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            {user.name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{user.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium font-sans">{user.email || "No email"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-100 border border-slate-200/50 rounded-md">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">
                          <span className="h-1 w-1 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Live Activity Stream (Col-Span-1) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-slate-955">System Logs</h2>
              <p className="text-xs text-slate-400 font-medium">Real-time administrator audit trail</p>
            </div>
            <Link href="/admin/audit-log">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5">
                Full Log <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2.5">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80">
                <Activity size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">No activity recorded yet</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="bg-white p-3.5 rounded-xl border border-slate-150 hover:border-indigo-200 flex gap-3 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors border border-slate-100">
                    <Activity size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{log.action}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.2 rounded">
                        {log.actionType}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
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
