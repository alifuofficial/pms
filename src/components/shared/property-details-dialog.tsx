"use client";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, MapPin, Layers, Maximize2, DollarSign } from "lucide-react";
import Link from "next/link";

export function PropertyDetailsDialog({ property, currency = "USD" }: { property: any, currency?: string }) {
  // Sort units by floor
  const sortedUnits = [...property.units].sort((a, b) => (a.floor || 0) - (b.floor || 0));

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-slate-500 hover:bg-slate-50">View</Button>} />
      <DialogContent className="sm:max-w-[600px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-semibold text-slate-900">{property.name}</DialogTitle>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <MapPin size={12} /> {property.address}
              </div>
            </div>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-500 uppercase">
              {property.type}
            </span>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 px-1">
               <h3 className="text-sm font-semibold text-slate-900">Unit Inventory</h3>
               <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{property.units.length} Total Units</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Floor</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-right">Rent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedUnits.length > 0 ? (
                    sortedUnits.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">{unit.unitNumber}</span>
                            <span className="text-[10px] text-slate-400">{unit.type}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium text-slate-600">Floor {unit.floor}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium text-slate-600">{unit.size} m²</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-semibold text-slate-900">{currency} {unit.rentAmount}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-400 font-medium italic">
                        No units registered for this property yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 rounded-lg text-xs font-semibold" 
            nativeButton={false}
            render={<Link href={`/admin/units?propertyId=${property.id}`} />}
          >
            Manage All Units
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
