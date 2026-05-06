import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { AddPropertyDialog } from "./add-property-dialog";
import { PropertyActions } from "./property-actions";
import { AddUnitDialog } from "./add-unit-dialog";
import { PropertyDetailsDialog } from "./property-details-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  MapPin, 
  Search, 
  TrendingUp, 
  Layers, 
  LayoutGrid, 
  LayoutList,
  Filter,
  MoreHorizontal
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

import { auth } from "@/auth";
import { getSystemSettings } from "@/lib/actions/settings";

export async function PropertiesView({ title = "Properties", canAdd = false }: { title?: string, canAdd?: boolean }) {
  const session = await auth();
  if (!session?.user) return null;

  const [properties, settings] = await Promise.all([
    prisma.property.findMany({
      where: session.user.role === "MANAGER" ? { managerId: session.user.id } : 
             session.user.role === "ACCOUNTANT" ? { accountantId: session.user.id } : {},
      include: { 
        units: true,
        manager: true,
        accountant: true
      },
    }),
    getSystemSettings()
  ]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Simplified Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 font-medium">Portfolio overview and management.</p>
        </div>
        <div className="flex items-center gap-2">
          {canAdd && <AddPropertyDialog />}
        </div>
      </div>

      {/* Search & Filter - Compact */}
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search properties..." 
            className="pl-9 h-10 bg-white border-slate-200 rounded-lg text-sm" 
          />
        </div>
        <Button variant="outline" size="sm" className="h-10 px-4 rounded-lg border-slate-200 text-sm font-medium">
          <Filter size={14} className="mr-2" /> Filters
        </Button>
      </div>

      {/* Simple Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p) => (
          <Card key={p.id} className="border border-slate-200 bg-white rounded-xl overflow-hidden hover:border-slate-300 transition-all shadow-none">
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900 leading-tight">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin size={12} />
                    <p className="text-xs font-medium truncate max-w-[150px]">{p.address}</p>
                  </div>
                </div>
                {canAdd && <PropertyActions property={p} />}
              </div>

              <div className="flex items-center gap-3 py-3 border-y border-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Units</p>
                  <p className="text-sm font-medium text-slate-900">{p.units.length} Total</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Manager</p>
                  <p className="text-sm font-medium text-slate-900 truncate">{p.manager.name}</p>
                </div>
                <div className="flex-1 min-w-0 border-l border-slate-50 pl-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Finance</p>
                  <p className="text-sm font-medium text-slate-900 truncate">{p.accountant?.name || "Unassigned"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-500 uppercase">
                  {p.type.toLowerCase()}
                </span>
                <div className="flex items-center gap-1">
                  <AddUnitDialog propertyId={p.id} propertyName={p.name} />
                  <PropertyDetailsDialog property={p} currency={settings.currency} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
