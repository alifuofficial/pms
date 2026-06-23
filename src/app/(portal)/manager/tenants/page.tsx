import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Users, Search, Mail, Home, Calendar, Filter, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RegisterTenantDialog } from "@/components/shared/register-tenant-dialog";
import { UserActions } from "@/components/shared/user-actions";
import { formatSystemDate } from "@/lib/calendar";
import { getSystemSettings } from "@/lib/actions/settings";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ManagerTenantsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    redirect("/auth/login");
  }

  const settings = await getSystemSettings();
  
  // Get managed properties
  const managedProperties = await prisma.property.findMany({
    where: { managerId: session.user.id },
    select: { id: true }
  });
  const propertyIds = managedProperties.map(p => p.id);

  const tenants = await prisma.user.findMany({
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
    include: {
      leases: {
        where: { 
          status: { in: ["ACTIVE", "PENDING"] },
          unit: { propertyId: { in: propertyIds } } // Only show relevant leases
        },
        include: { 
          unit: { include: { property: true } },
          payments: { where: { type: "ADVANCE", status: "APPROVED" } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tenant Directory</h1>
          <p className="text-sm text-slate-500 font-medium">Manage active residents and occupancy details.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search tenants..." className="pl-9 h-9 w-64 bg-white border-slate-200 rounded-lg text-sm" />
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 text-xs font-semibold">
            <Filter size={14} className="mr-2" /> Filter
          </Button>
          <RegisterTenantDialog currency={settings.currency} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-3 px-6">Resident Info</th>
              <th className="py-3 px-6">Assigned Unit</th>
              <th className="py-3 px-6">Lease Period</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tenants.map((tenant) => {
              return (
                <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-100 uppercase">
                        {tenant.name?.[0] || "T"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{tenant.name || "Unnamed Tenant"}</p>
                        <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Mail size={10} /> {tenant.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-3">
                      {tenant.leases.length > 0 ? (
                        tenant.leases.map((lease: any) => (
                          <div key={lease.id} className="space-y-1 pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <Home size={12} className="text-blue-500" />
                                <p className="text-xs font-semibold text-slate-700">Unit {lease.unit.unitNumber}</p>
                              </div>
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                lease.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                              )}>
                                {lease.status === "ACTIVE" ? "Active" : "Pending Review"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                              {lease.unit.property.name}
                            </p>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">No Active Lease</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-3">
                      {tenant.leases.length > 0 ? (
                        tenant.leases.map((lease: any) => (
                          <div key={lease.id} className="space-y-1 pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-slate-400" />
                              <p className="text-xs font-semibold text-slate-700">
                                {formatSystemDate(new Date(lease.startDate), "ETHIOPIAN")}
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                              Ends {formatSystemDate(new Date(lease.endDate), "ETHIOPIAN")}
                            </p>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <UserActions user={tenant} currency={settings.currency} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
