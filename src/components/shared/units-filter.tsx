"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Filter, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function UnitsFilter({ properties }: { properties: { id: string, name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [filters, setFilters] = useState({
    propertyId: searchParams.get("propertyId") || "",
    status: searchParams.get("status") || "",
    type: searchParams.get("type") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  });

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const resetFilters = () => {
    const reset = {
      propertyId: "",
      status: "",
      type: "",
      minPrice: "",
      maxPrice: "",
    };
    setFilters(reset);
    router.push("?");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button variant="outline" size="sm" className={cn(
          "h-9 rounded-lg border-slate-200 text-xs font-semibold relative",
          activeFiltersCount > 0 && "border-blue-200 bg-blue-50 text-blue-600"
        )}>
          <Filter size={14} className="mr-2" /> 
          Advanced Filter
          {activeFiltersCount > 0 && (
            <span className="ml-2 bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      } />
      <PopoverContent align="end" className="w-80 bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Filter Units</h3>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider">
            Reset All
          </Button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase text-slate-400">By Property</Label>
            <select 
              className="w-full rounded-lg border border-slate-200 bg-white h-9 px-3 text-xs font-medium outline-none"
              value={filters.propertyId}
              onChange={(e) => setFilters({ ...filters, propertyId: e.target.value })}
            >
              <option value="">All Properties</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Status</Label>
              <select 
                className="w-full rounded-lg border border-slate-200 bg-white h-9 px-3 text-xs font-medium outline-none"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Any Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Unit Type</Label>
              <select 
                className="w-full rounded-lg border border-slate-200 bg-white h-9 px-3 text-xs font-medium outline-none"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">Any Type</option>
                <option value="Studio">Studio</option>
                <option value="1BR">1 Bedroom</option>
                <option value="2BR">2 Bedrooms</option>
                <option value="Office">Office</option>
                <option value="Retail">Retail</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase text-slate-400">Monthly Rent Range</Label>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Min" 
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                className="h-9 text-xs rounded-lg"
              />
              <span className="text-slate-300">-</span>
              <Input 
                placeholder="Max" 
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="h-9 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <Button onClick={applyFilters} className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg">
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
