"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Property {
  id: string;
  name: string;
}

interface VacantUnit {
  id: string;
  unitNumber: string;
  type: string;
  rentAmount: number;
  property: Property;
}

export function VacantSpacesWidget({ 
  vacantUnits = [], 
  currency = "ETB" 
}: { 
  vacantUnits: VacantUnit[];
  currency?: string;
}) {
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // Get unique properties that have vacant units
  const propertiesMap = new Map<string, Property>();
  for (const unit of vacantUnits) {
    propertiesMap.set(unit.property.id, unit.property);
  }
  const uniqueProperties = Array.from(propertiesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Count vacant units per property
  const getCountForProperty = (propId: string) => {
    return vacantUnits.filter(u => u.property.id === propId).length;
  };

  // Filter vacant units based on selected tab
  const filteredUnits = activeTab === "ALL" 
    ? vacantUnits 
    : vacantUnits.filter(u => u.property.id === activeTab);

  return (
    <div className="space-y-4">
      {/* Property Tabs Header */}
      {uniqueProperties.length > 0 && (
        <div className="flex border-b border-slate-100 overflow-x-auto custom-scrollbar whitespace-nowrap pb-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center gap-1.5 border border-transparent select-none",
              activeTab === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100/80 hover:text-slate-800"
            )}
          >
            All
            <Badge variant="outline" className={cn(
              "font-bold text-[8.5px] px-1 py-0 border-none shadow-none leading-none",
              activeTab === "ALL" ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-600"
            )}>
              {vacantUnits.length}
            </Badge>
          </button>

          {uniqueProperties.map((prop) => {
            const isActive = activeTab === prop.id;
            const count = getCountForProperty(prop.id);
            return (
              <button
                key={prop.id}
                type="button"
                onClick={() => setActiveTab(prop.id)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center gap-1.5 border border-transparent select-none",
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100/80 hover:text-slate-800"
                )}
              >
                {prop.name}
                <Badge variant="outline" className={cn(
                  "font-bold text-[8.5px] px-1 py-0 border-none shadow-none leading-none",
                  isActive ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-600"
                )}>
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* Vacant List Content */}
      <div>
        {filteredUnits.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-1.5 animate-in fade-in">
            <Building2 size={24} className="mx-auto text-slate-200" />
            <p className="text-xs font-semibold uppercase tracking-wider">All Units Leased</p>
            <p className="text-[10px] text-slate-400 font-normal">No vacant spaces available currently.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {filteredUnits.map((unit) => (
              <div 
                key={unit.id} 
                className="p-3 bg-slate-50 hover:bg-indigo-50/20 border border-slate-100 rounded-xl flex items-center justify-between group transition-all duration-200 animate-in fade-in"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Unit {unit.unitNumber}
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 border border-slate-200/50 px-1 py-0.2 rounded">
                      {unit.type}
                    </span>
                  </div>
                  {activeTab === "ALL" && (
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight mt-0.5 truncate">
                      {unit.property.name}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-slate-900">
                    {unit.rentAmount.toLocaleString()} {currency}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium">/ month</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
