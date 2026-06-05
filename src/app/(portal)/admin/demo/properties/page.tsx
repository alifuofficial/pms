"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Building2, 
  MapPin, 
  Plus, 
  RefreshCw,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { 
  getProperties, 
  saveProperties, 
  getUnits, 
  saveUnits, 
  getSettings, 
  logAction, 
  Property, 
  Unit 
} from "@/lib/demo-store";

export default function DemoProperties() {
  const [isMounted, setIsMounted] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [currency, setCurrency] = useState("ETB");

  // Dialog open state
  const [propDialogOpen, setPropDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  
  // Forms state
  const [newProperty, setNewProperty] = useState({ name: "", address: "", type: "COMMERCIAL" });
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [newUnit, setNewUnit] = useState({ unitNumber: "", type: "Retail", rentAmount: "" });

  useEffect(() => {
    setIsMounted(true);
    setProperties(getProperties());
    setUnits(getUnits());
    setCurrency(getSettings().currency);
  }, []);

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Property = {
      id: "prop-" + Math.random().toString(36).substring(2, 9),
      name: newProperty.name,
      address: newProperty.address,
      type: newProperty.type,
      manager: { name: "Mock Manager" }
    };
    const updated = [...properties, created];
    setProperties(updated);
    saveProperties(updated);
    setPropDialogOpen(false);
    setNewProperty({ name: "", address: "", type: "COMMERCIAL" });
    toast.success("Sandbox property added!");
    logAction(`Added simulated Property: ${created.name}`);
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Unit = {
      id: "unit-" + Math.random().toString(36).substring(2, 9),
      propertyId: selectedPropertyId,
      unitNumber: newUnit.unitNumber,
      type: newUnit.type,
      rentAmount: parseFloat(newUnit.rentAmount) || 0,
      status: "VACANT"
    };
    const updated = [...units, created];
    setUnits(updated);
    saveUnits(updated);
    setUnitDialogOpen(false);
    setNewUnit({ unitNumber: "", type: "Retail", rentAmount: "" });
    toast.success("Sandbox unit added!");
    logAction(`Added simulated Unit ${created.unitNumber}`);
  };

  if (!isMounted) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Banner / Warn */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-3 items-start md:items-center">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Demo Sandbox Mode Active</h3>
            <p className="text-xs text-amber-700 font-medium">Managing local sandbox property portfolios.</p>
          </div>
        </div>
        <Link href="/admin/properties">
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-9 rounded-lg font-medium shadow-none self-start md:self-auto">
            Switch to Live Mode <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Properties (Demo)</h1>
          <p className="text-sm text-slate-500 font-medium font-sans">Simulated property portfolio overview.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Add Property Dialog */}
          <Dialog open={propDialogOpen} onOpenChange={setPropDialogOpen}>
            <DialogTrigger render={<Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 font-medium shadow-none" />}>
              <Plus className="mr-2 h-4 w-4" /> Add Property
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateProperty}>
                <DialogHeader>
                  <DialogTitle>Add Sandbox Property</DialogTitle>
                  <DialogDescription>Create a mock physical site/property.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Property Name</label>
                    <Input required value={newProperty.name} onChange={e => setNewProperty({...newProperty, name: e.target.value})} placeholder="e.g. Lideta Mall" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Address</label>
                    <Input required value={newProperty.address} onChange={e => setNewProperty({...newProperty, address: e.target.value})} placeholder="e.g. Lideta, Addis Ababa" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Type</label>
                    <Select value={newProperty.type} onValueChange={val => setNewProperty({...newProperty, type: val || "COMMERCIAL"})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                        <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-slate-900 text-white rounded-lg hover:bg-slate-800">Add Property</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid of property cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p) => {
          const propUnits = units.filter(u => u.propertyId === p.id);
          return (
            <Card key={p.id} className="border border-slate-200 bg-white rounded-xl overflow-hidden hover:border-slate-300 transition-all shadow-none">
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900 leading-tight">{p.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin size={12} />
                    <p className="text-xs font-medium truncate max-w-[200px]">{p.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-3 border-y border-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Units</p>
                    <p className="text-sm font-medium text-slate-900">{propUnits.length} Total</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Manager</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{p.manager?.name || "Mock Manager"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-500 uppercase">
                    {p.type?.toLowerCase() || "commercial"}
                  </span>
                  
                  {/* Add Unit Dialog */}
                  <Dialog open={unitDialogOpen && selectedPropertyId === p.id} onOpenChange={open => {
                    if (open) {
                      setSelectedPropertyId(p.id);
                      setUnitDialogOpen(true);
                    } else {
                      setUnitDialogOpen(false);
                    }
                  }}>
                    <DialogTrigger render={<Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 shadow-none font-semibold text-xs" />} >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Unit
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <form onSubmit={handleCreateUnit}>
                        <DialogHeader>
                          <DialogTitle>Add Unit to {p.name}</DialogTitle>
                          <DialogDescription>Creates a simulated rental unit under this property.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-700">Unit Number</label>
                              <Input required value={newUnit.unitNumber} onChange={e => setNewUnit({...newUnit, unitNumber: e.target.value})} placeholder="e.g. 101" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-700">Unit Type</label>
                              <Select value={newUnit.type} onValueChange={val => setNewUnit({...newUnit, type: val || "Retail"})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Retail">Retail</SelectItem>
                                  <SelectItem value="Office">Office</SelectItem>
                                  <SelectItem value="Apartment">Apartment</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Monthly Rent Amount</label>
                            <Input required type="number" value={newUnit.rentAmount} onChange={e => setNewUnit({...newUnit, rentAmount: e.target.value})} placeholder="e.g. 12000" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="bg-slate-900 text-white rounded-lg hover:bg-slate-800">Create Unit</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
