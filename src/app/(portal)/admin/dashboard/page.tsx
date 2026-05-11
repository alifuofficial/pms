import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  Clock, 
  ShieldCheck, 
  Search, 
  Plus,
  ArrowUpRight,
  Activity,
  UserCog,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RevenueChart, OccupancyChart, PaymentTypeChart } from "@/components/shared/dashboard-charts";
import { PenaltyList } from "@/components/shared/penalty-list";
import { Badge } from "@/components/ui/badge";
import { getSystemToday } from "@/lib/calendar";
import { getRevenueAnalytics, getOccupancyAnalytics, getRecentAuditLogs, getPaymentTypeBreakdown } from "@/lib/actions/analytics";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function AdminDashboard() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
  
  const [
    revenueData,
    occupancyData,
    paymentBreakdown,
    auditLogs,
    stats
  ] = await Promise.all([
    getRevenueAnalytics(),
    getOccupancyAnalytics(),
    getPaymentTypeBreakdown(),
    getRecentAuditLogs(10),
    (async () => ({
      totalProperties: await prisma.property.count(),
      activeTenants: await prisma.user.count({ where: { role: "TENANT" } }),
      pendingApprovals: await prisma.payment.count({ where: { status: "PENDING" } }),
      totalRevenue: await (async () => {
        const rent = await prisma.payment.aggregate({
          where: { status: "APPROVED" },
          _sum: { amount: true }
        });
        const penalty = await prisma.penalty.aggregate({
          where: { status: "PAID" },
          _sum: { paidAmount: true }
        });
        return (rent._sum.amount || 0) + (penalty._sum.paidAmount || 0);
      })()
    }))()
  ]);

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const pendingPenalties = await prisma.penalty.findMany({
    where: {
      status: "UNPAID"
    },
    include: {
      tenant: true,
      lease: { include: { unit: true } }
    },
    orderBy: { dueDate: "desc" },
    take: 10
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin Dashboard</h1>
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
              placeholder="Search data..." 
              className="pl-9 h-9 w-48 bg-white border-slate-200 rounded-lg text-sm" 
            />
          </div>
          <Button size="sm" className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-none font-medium">
            <Plus className="mr-2 h-3.5 w-3.5" /> Action
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Properties", value: stats.totalProperties, icon: Building2, color: "text-blue-500" },
          { label: "Tenants", value: stats.activeTenants, icon: Users, color: "text-emerald-500" },
          { label: "Pending", value: stats.pendingApprovals, icon: Clock, color: "text-amber-500" },
          { label: "Revenue", value: `${settings?.currency || 'USD'} ${stats.totalRevenue.toLocaleString()}`, icon: ShieldCheck, color: "text-indigo-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
            </div>
            <stat.icon className={cn("h-6 w-6", stat.color)} strokeWidth={1.5} />
          </div>
        ))}
      </div>

      {/* Analytics & Penalty Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Revenue Chart - Full Width of this column */}
          <Card className="border border-slate-200 shadow-none bg-white rounded-xl">
            <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Monthly Collections</p>
              </div>
              <div className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded">
                LIVE
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <RevenueChart data={revenueData} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-slate-200 shadow-none bg-white rounded-xl">
              <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-semibold">Occupancy Rate</CardTitle>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Unit Utilization</p>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[10px] tracking-tighter uppercase">Sync</Badge>
              </CardHeader>
              <CardContent className="p-5">
                <OccupancyChart data={occupancyData} />
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-none bg-white rounded-xl">
              <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-semibold">Payment Breakdown</CardTitle>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Distribution</p>
                </div>
                <Badge variant="outline" className="text-indigo-600 border-indigo-100 bg-indigo-50 font-bold text-[10px] uppercase">Type</Badge>
              </CardHeader>
              <CardContent className="p-5">
                <PaymentTypeChart data={paymentBreakdown} />
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="lg:col-span-1">
          <PenaltyList penalties={pendingPenalties} currency={settings?.currency || "USD"} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-800">Recent Users</h2>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 font-semibold">
                View all
              </Button>
           </div>
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                 <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200">
                   <tr>
                     <th className="py-3 px-5">User</th>
                     <th className="py-3 px-5">Role</th>
                     <th className="py-3 px-5 text-right">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {recentUsers.map((user) => (
                     <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="py-4 px-5">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-600 text-xs">
                             {user.name?.[0] || "U"}
                           </div>
                           <div>
                             <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                             <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                           </div>
                         </div>
                       </td>
                       <td className="py-4 px-5">
                         <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-50 rounded border border-slate-100">
                           {user.role}
                         </span>
                       </td>
                       <td className="py-4 px-5 text-right">
                         <span className="text-[10px] font-semibold text-emerald-600 uppercase">Active</span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-800">Activity Log</h2>
            <Link href="/admin/audit-log">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 font-semibold">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-100">
                <Activity size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">No activity recorded yet</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="bg-white p-3 rounded-lg border border-slate-100 flex gap-3 hover:border-slate-200 transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <Activity size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{log.action}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
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
