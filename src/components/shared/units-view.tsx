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
import { Pagination } from "./pagination";
import { UnitsBulkTable } from "./units-bulk-table";

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

  const page = parseInt(searchParams?.page || "1");
  const limit = parseInt(searchParams?.limit || "10");
  const skip = (page - 1) * limit;

  const [units, totalCount] = await Promise.all([
    prisma.unit.findMany({
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
      skip,
      take: limit,
    }),
    prisma.unit.count({ where })
  ]);

  const totalPages = Math.ceil(totalCount / limit);

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

      <UnitsBulkTable units={units} currency={settings.currency} />
      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  );
}
