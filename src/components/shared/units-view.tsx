import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, Printer, Eye, EyeOff } from "lucide-react";
import { PdfDownloadButton } from "./pdf-download-button";
import { cn } from "@/lib/utils";
import { UnitsBulkTable } from "./units-bulk-table";
import { AddUnitDialog } from "./add-unit-dialog";
import { UnitsFilter } from "./units-filter";
import { UnitsSearchInput } from "./units-search-input";
import { FloorTabs } from "./floor-tabs";
import { getProperties } from "@/lib/actions/properties";
import { getSystemSettings } from "@/lib/actions/settings";
import { DataImportExport } from "./data-import-export";
import { exportUnitsCsv, importUnitsCsv } from "@/lib/actions/import-export";
import { Pagination } from "./pagination";

export async function UnitsView({ 
  title = "Inventory",
  searchParams 
}: { 
  title?: string,
  searchParams?: any
}) {
  const properties = await getProperties();
  const settings = await getSystemSettings();

  // ── Build where clause from searchParams ─────────────────────
  const where: any = {};
  if (searchParams?.propertyId) where.propertyId = searchParams.propertyId;
  if (searchParams?.status)     where.status     = searchParams.status;
  if (searchParams?.type)       where.type       = searchParams.type;
  if (searchParams?.qrPrinted)  where.qrPrinted  = searchParams.qrPrinted === "true";
  if (searchParams?.minPrice || searchParams?.maxPrice) {
    where.rentAmount = {};
    if (searchParams.minPrice) where.rentAmount.gte = parseFloat(searchParams.minPrice);
    if (searchParams.maxPrice) where.rentAmount.lte = parseFloat(searchParams.maxPrice);
  }
  if (searchParams?.q) {
    where.OR = [
      { unitNumber: { contains: searchParams.q } },
      { property:   { name:    { contains: searchParams.q } } }
    ];
  }
  // Floor tab filter
  const currentFloor = searchParams?.floor !== undefined && searchParams.floor !== ""
    ? parseInt(searchParams.floor as string)
    : undefined;
  if (currentFloor !== undefined) where.floor = currentFloor;

  // ── Pagination ───────────────────────────────────────────────
  const page  = parseInt(searchParams?.page  || "1");
  const limit = parseInt(searchParams?.limit || "10");
  const skip  = (page - 1) * limit;

  // ── Main queries ─────────────────────────────────────────────
  // Run all queries in parallel
  const [units, totalCount, allFloors, allUnitsForCounts] = await Promise.all([
    // Paginated units matching current filters
    prisma.unit.findMany({
      where,
      include: { 
        property: true,
        mergedInto: true,
        mergedUnits: true,
        leases: {
          where: { status: { in: ["ACTIVE", "SEALED"] } },
          include: { tenant: true },
          take: 1
        }
      },
      orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
      skip,
      take: limit,
    }),
    // Total count for pagination
    prisma.unit.count({ where }),
    // Distinct floor values across ALL units (ignoring active floor tab filter)
    prisma.unit.findMany({
      where: (() => {
        // Same filters EXCEPT floor, so tabs show all available floors
        const base: any = {};
        if (searchParams?.propertyId) base.propertyId = searchParams.propertyId;
        if (searchParams?.status)     base.status     = searchParams.status;
        if (searchParams?.type)       base.type       = searchParams.type;
        if (searchParams?.qrPrinted)  base.qrPrinted  = searchParams.qrPrinted === "true";
        if (searchParams?.q) {
          base.OR = [
            { unitNumber: { contains: searchParams.q } },
            { property:   { name:    { contains: searchParams.q } } }
          ];
        }
        return base;
      })(),
      select: { floor: true },
      distinct: ["floor"],
      orderBy:  { floor: "asc" },
    }),
    // Per-floor counts (same base filter, no floor filter)
    prisma.unit.groupBy({
      by:    ["floor"],
      where: (() => {
        const base: any = {};
        if (searchParams?.propertyId) base.propertyId = searchParams.propertyId;
        if (searchParams?.status)     base.status     = searchParams.status;
        if (searchParams?.type)       base.type       = searchParams.type;
        if (searchParams?.qrPrinted)  base.qrPrinted  = searchParams.qrPrinted === "true";
        if (searchParams?.q) {
          base.OR = [
            { unitNumber: { contains: searchParams.q } },
            { property:   { name:    { contains: searchParams.q } } }
          ];
        }
        return base;
      })(),
      _count: { _all: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  // Build floors array and counts map
  const distinctFloors = allFloors.map((u) => u.floor ?? 0).sort((a, b) => a - b);
  const floorCounts: Record<number, number> = {};
  allUnitsForCounts.forEach((g) => {
    floorCounts[g.floor ?? 0] = g._count._all;
  });
  const grandTotalForTabs = Object.values(floorCounts).reduce((s, n) => s + n, 0);

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 animate-in fade-in duration-700">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 font-medium">Detailed inventory of all managed rental units.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Suspense fallback={
            <div className="h-9 w-64 bg-slate-100 rounded-lg animate-pulse" />
          }>
            <UnitsSearchInput defaultValue={searchParams?.q} />
          </Suspense>
          <Suspense fallback={
            <div className="h-9 w-28 bg-slate-100 rounded-lg animate-pulse" />
          }>
            <UnitsFilter properties={properties} />
          </Suspense>
          <DataImportExport 
            type="UNITS"
            onExport={exportUnitsCsv}
            onImport={importUnitsCsv}
          />
          {(() => {
            const isNonPrintedFiltered = searchParams?.qrPrinted === "false";
            const toggleParams = new URLSearchParams();
            if (searchParams?.propertyId) toggleParams.set("propertyId", searchParams.propertyId);
            if (searchParams?.status) toggleParams.set("status", searchParams.status);
            if (searchParams?.type) toggleParams.set("type", searchParams.type);
            if (searchParams?.floor !== undefined && searchParams.floor !== "") toggleParams.set("floor", String(searchParams.floor));
            if (searchParams?.q) toggleParams.set("q", searchParams.q);
            
            if (!isNonPrintedFiltered) {
              toggleParams.set("qrPrinted", "false");
            }
            const toggleQueryString = toggleParams.toString();
            const toggleHref = toggleQueryString ? `?${toggleQueryString}` : "?";

            const printParams = new URLSearchParams();
            if (searchParams?.propertyId) printParams.set("propertyId", searchParams.propertyId);
            if (searchParams?.status) printParams.set("status", searchParams.status);
            if (searchParams?.type) printParams.set("type", searchParams.type);
            if (searchParams?.qrPrinted) printParams.set("qrPrinted", searchParams.qrPrinted);
            if (searchParams?.floor !== undefined && searchParams.floor !== "") printParams.set("floor", String(searchParams.floor));
            if (searchParams?.q) printParams.set("q", searchParams.q);
            const printQueryString = printParams.toString();

            return (
              <div className="flex items-center gap-2">
                <a
                  href={toggleHref}
                  className={cn(
                    buttonVariants({ variant: isNonPrintedFiltered ? "default" : "outline", size: "sm" }),
                    "h-9 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-none transition-all duration-200",
                    isNonPrintedFiltered 
                      ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-600 hover:border-amber-500" 
                      : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                  )}
                >
                  {isNonPrintedFiltered ? <EyeOff size={14} /> : <Eye size={14} />}
                  {isNonPrintedFiltered ? "Showing Non-Printed Only" : "Filter Non-Printed"}
                </a>
                
                <a
                  href={printQueryString ? `/admin/units/print-all?${printQueryString}` : "/admin/units/print-all"}
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-9 rounded-lg border-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer bg-white shadow-none hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Printer size={14} className={cn("text-slate-500", isNonPrintedFiltered && "text-amber-500")} />
                  {isNonPrintedFiltered ? "Print Non-Printed" : "Print QRs (A4)"}
                </a>

                <PdfDownloadButton searchParams={searchParams} />
              </div>
            );
          })()}
          <AddUnitDialog 
            trigger={
              <Button className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 shadow-none">
                <Plus size={14} className="mr-2" /> New Unit
              </Button>
            }
          />
        </div>
      </div>

      {/* ── Floor Tabs ───────────────────────────────────────── */}
      {distinctFloors.length > 0 && (
        <Suspense fallback={
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        }>
          <FloorTabs
            floors={distinctFloors}
            counts={floorCounts}
            currentFloor={currentFloor}
            totalCount={grandTotalForTabs}
          />
        </Suspense>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      <UnitsBulkTable units={units} currency={settings.currency} />
      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  );
}
