import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  Home,
  Clock, 
  ShieldCheck, 
  Search, 
  Plus,
  ArrowUpRight,
  Activity,
  ChevronRight,
  UserPlus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RevenueChart, OccupancyChart } from "@/components/shared/dashboard-charts";
import { PenaltyList } from "@/components/shared/penalty-list";
import { Badge } from "@/components/ui/badge";
import { getSystemToday } from "@/lib/calendar";
import Link from "next/link";
import { getRevenueAnalytics, getOccupancyAnalytics, getRecentAuditLogs } from "@/lib/actions/analytics";
import { getPendingPenalties } from "@/lib/actions/penalties";
import { formatDistanceToNow } from "date-fns";

export default async function ManagerDashboard() {
  const session = await auth();
  if (!session?.user) return null;
  
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
  
  // Get properties assigned to this manager
  const managedProperties = await prisma.property.findMany({
    where: { managerId: session.user.id },
    select: { id: true }
  });
  const propertyIds = managedProperties.map(p => p.id);

  const [
    revenueData,
    occupancyData,
    auditLogs,
    stats,
    pendingPenalties
  ] = await Promise.all([
    getRevenueAnalytics(6, propertyIds),
    getOccupancyAnalytics(6, propertyIds),
    getRecentAuditLogs(10),
    (async () => {
      const propertyFilter = propertyIds.length > 0 ? { propertyId: { in: propertyIds } } : { id: "none" };
      const [totalProps, totalUnits, occupiedUnits, availableUnits] = await Promise.all([
        prisma.property.count({ where: { managerId: session.user.id } }),
        prisma.unit.count({ where: propertyFilter }),
        prisma.unit.count({ where: { ...propertyFilter, status: "OCCUPIED" } }),
        prisma.unit.count({ where: { ...propertyFilter, status: "AVAILABLE" } }),
      ]);
      return { totalProps, totalUnits, occupiedUnits, availableUnits };
    })(),
    getPendingPenalties({ propertyIds, take: 5 })
  ]);

  const occupancyRate = stats.totalUnits > 0 
    ? ((stats.occupiedUnits / stats.totalUnits) * 100).toFixed(1) 
    : "0";

  const recentTenants = await prisma.user.findMany({
    where: { 
      role: "TENANT",
      leases: {
        some: {
          unit: {
            propertyId: { in: propertyIds }
          }
        }
      }
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const recentLeases = await prisma.lease.findMany({
    where: {
      unit: {
        propertyId: { in: propertyIds }
      }
    },
    take: 4,
    include: { tenant: true, unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Manager Overview</h1>
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
          <Link href="/manager/tenants">
            <Button size="sm" variant="outline" className="h-9 rounded-lg border-slate-200 text-slate-600 font-medium">
              <UserPlus className="mr-2 h-3.5 w-3.5" /> Register Tenant
            </Button>
          </Link>
          <Link href="/manager/properties">
            <Button size="sm" className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-none font-medium">
              <Plus className="mr-2 h-3.5 w-3.5" /> New Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Portfolios", value: stats.totalProps, icon: Building2, color: "text-blue-500" },
          { label: "Managed Units", value: stats.totalUnits, icon: Home, color: "text-indigo-500" },
          { label: "Available Now", value: stats.availableUnits, icon: Clock, color: "text-amber-500" },
          { label: "Avg Occupancy", value: `${occupancyRate}%`, icon: Users, color: "text-emerald-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
            </div>
            <div className={cn("p-2 rounded-lg bg-slate-50")}>
              <stat.icon className={cn("h-5 w-5", stat.color)} strokeWidth={2} />
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-slate-200 shadow-none bg-white rounded-xl">
          <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold text-slate-900">Performance Trend</CardTitle>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Financial Overview</p>
            </div>
            <div className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded">
              AUTO-SYNC
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-none bg-white rounded-xl">
          <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold text-slate-900">Portfolio Health</CardTitle>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Occupancy vs Vacancy</p>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[10px] tracking-tighter uppercase">Live</Badge>
          </CardHeader>
          <CardContent className="p-5">
            <OccupancyChart data={occupancyData} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tenants Table */}
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Recent Tenants</h2>
              <Link href="/manager/tenants">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 font-semibold hover:bg-blue-50">
                  View All Directory <ChevronRight size={14} className="ml-1" />
                </Button>
              </Link>
           </div>
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                 <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200">
                   <tr>
                     <th className="py-3 px-5">Tenant Info</th>
                     <th className="py-3 px-5">Contact</th>
                     <th className="py-3 px-5 text-right">Registered</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {recentTenants.length === 0 ? (
                     <tr>
                       <td colSpan={3} className="py-10 text-center text-xs text-slate-400 italic">No recent tenants found.</td>
                     </tr>
                   ) : (
                     recentTenants.map((tenant) => (
                       <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                         <td className="py-4 px-5">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-[10px] uppercase">
                               {tenant.name?.[0] || "T"}
                             </div>
                             <div>
                               <p className="text-sm font-bold text-slate-900">{tenant.name}</p>
                               <p className="text-[10px] text-slate-400 font-medium">ID: {tenant.id.slice(-6).toUpperCase()}</p>
                             </div>
                           </div>
                         </td>
                         <td className="py-4 px-5">
                           <p className="text-xs font-medium text-slate-600">{tenant.email}</p>
                         </td>
                         <td className="py-4 px-5 text-right text-[10px] font-bold text-slate-400">
                           {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
              </table>
           </div>
        </div>
        {/* Recent Activity Sidebar */}
        <div className="space-y-6">
          <PenaltyList penalties={pendingPenalties} currency={settings?.currency || "USD"} />

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 px-1 uppercase tracking-tight">Recent Activity</h2>
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-xl border border-slate-100 shadow-sm">
                <Activity size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400 italic">No activity recorded</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-3 hover:border-blue-200 transition-all group shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-110 transition-transform">
                    <Activity size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {log.action}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <Link href="/manager/tenants" className="block pt-2">
              <Button variant="ghost" className="w-full h-9 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-dashed border-slate-200 hover:bg-slate-50 hover:text-slate-600">
                Full Activity Log
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
