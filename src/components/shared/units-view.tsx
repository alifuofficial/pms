import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Home, Search, Plus, Building2, Layers, Maximize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UnitActions } from "./unit-actions";
import { AddUnitDialog } from "./add-unit-dialog";
import { UnitsFilter } from "./units-filter";
import { getProperties } from "@/lib/actions/properties";
import { getSystemSettings } from "@/lib/actions/settings";
import { DataImportExport } from "./data-import-export";
import { exportUnitsCsv, importUnitsCsv } from "@/lib/actions/import-export";

export async function UnitsView({ 
  title = "Inventory",
  searchParams 
}: { 
  title?: string,
  searchParams?: any
}) {
  const properties = await getProperties();
  const settings = await getSystemSettings();

  
  const where: any = {};
  if (searchParams?.propertyId) where.propertyId = searchParams.propertyId;
  if (searchParams?.status) where.status = searchParams.status;
  if (searchParams?.type) where.type = searchParams.type;
  if (searchParams?.minPrice || searchParams?.maxPrice) {
    where.rentAmount = {};
    if (searchParams.minPrice) where.rentAmount.gte = parseFloat(searchParams.minPrice);
    if (searchParams.maxPrice) where.rentAmount.lte = parseFloat(searchParams.maxPrice);
  }
  if (searchParams?.q) {
    where.OR = [
      { unitNumber: { contains: searchParams.q } },
      { property: { name: { contains: searchParams.q } } }
    ];
  }

  const units = await prisma.unit.findMany({
    where,
    include: { 
      property: true,
      leases: {
        where: { status: "ACTIVE" },
        include: { tenant: true },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 font-medium">Detailed inventory of all managed rental units.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Unit # or Property..." className="pl-9 h-9 w-64 bg-white border-slate-200 rounded-lg text-sm" />
          </div>
          <UnitsFilter properties={properties} />
          <DataImportExport 
            type="UNITS"
            onExport={exportUnitsCsv}
            onImport={importUnitsCsv}
          />
          <AddUnitDialog 
            trigger={
              <Button className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 shadow-none">
                <Plus size={14} className="mr-2" /> New Unit
              </Button>
            }
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-3 px-6">Unit</th>
              <th className="py-3 px-6">Location</th>
              <th className="py-3 px-6">Specs</th>
              <th className="py-3 px-6">Financials</th>
              <th className="py-3 px-6 text-center">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {units.map((unit) => (
              <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                      <Home size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Unit {unit.unitNumber}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">{unit.type}</p>
                      {unit.status === "OCCUPIED" && (unit as any).leases?.[0]?.tenant && (
                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5 truncate max-w-[140px]">
                          Occupied by: {(unit as any).leases[0].tenant.name}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-6">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <Building2 size={12} className="text-slate-400" />
                      {unit.property.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Layers size={10} /> Floor {unit.floor}
                    </p>
                  </div>
                </td>
                <td className="py-3 px-6">
                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
                    <Maximize2 size={12} className="text-slate-400" />
                    <span>{unit.size} m²</span>
                  </div>
                </td>
                <td className="py-3 px-6">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-slate-900">{settings.currency} {unit.rentAmount.toLocaleString()}</p>

                    <p className="text-[10px] text-slate-400 font-semibold uppercase">monthly rent</p>
                  </div>
                </td>
                <td className="py-3 px-6 text-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-tight border",
                    unit.status === "AVAILABLE" 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : "bg-amber-50 text-amber-600 border-amber-100"
                  )}>
                    {unit.status.toLowerCase()}
                  </span>
                </td>
                <td className="py-3 px-6 text-right">
                  <UnitActions unit={unit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
