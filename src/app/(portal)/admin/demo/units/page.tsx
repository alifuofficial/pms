"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Building2, 
  Plus, 
  RefreshCw,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getProperties, 
  getUnits, 
  saveUnits, 
  getSettings, 
  logAction, 
  Property, 
  Unit 
} from "@/lib/demo-store";

export default function DemoUnits() {
  const [isMounted, setIsMounted] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [currency, setCurrency] = useState("ETB");

  // Dialog open state
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  
  // Forms state
  const [newUnit, setNewUnit] = useState({ propertyId: "", unitNumber: "", type: "Retail", rentAmount: "" });

  useEffect(() => {
    setIsMounted(true);
    setProperties(getProperties());
    setUnits(getUnits());
    setCurrency(getSettings().currency);
  }, []);

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Unit = {
      id: "unit-" + Math.random().toString(36).substring(2, 9),
      propertyId: newUnit.propertyId,
      unitNumber: newUnit.unitNumber,
      type: newUnit.type,
      rentAmount: parseFloat(newUnit.rentAmount) || 0,
      status: "VACANT"
    };
    const updated = [...units, created];
    setUnits(updated);
    saveUnits(updated);
    setUnitDialogOpen(false);
    setNewUnit({ propertyId: "", unitNumber: "", type: "Retail", rentAmount: "" });
    toast.success("Sandbox unit added!");
    logAction(`Added simulated Unit ${created.unitNumber}`);
  };

  const handleUpdateRent = (unitId: string, rentAmount: number) => {
    const updated = units.map(u => {
      if (u.id === unitId) return { ...u, rentAmount };
      return u;
    });
    setUnits(updated);
    saveUnits(updated);
    const unit = units.find(u => u.id === unitId);
    toast.success(`Unit ${unit?.unitNumber} rent rate adjusted!`);
    logAction(`Adjusted simulated Unit ${unit?.unitNumber} rent to ${rentAmount}`);
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
            <p className="text-xs text-amber-700 font-medium">Modifying simulated rental unit pricing and availability.</p>
          </div>
        </div>
        <Link href="/admin/units">
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-9 rounded-lg font-medium shadow-none self-start md:self-auto">
            Switch to Live Mode <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Units (Demo)</h1>
          <p className="text-sm text-slate-500 font-medium font-sans">Simulated property units list.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Add Unit Dialog */}
          <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
            <DialogTrigger render={<Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 font-medium shadow-none" />} >
              <Plus className="mr-2 h-4 w-4" /> Add Unit
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateUnit}>
                <DialogHeader>
                  <DialogTitle>Add Sandbox Unit</DialogTitle>
                  <DialogDescription>Creates a simulated rental unit under a property.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Select Property</label>
                    <Select value={newUnit.propertyId} onValueChange={val => setNewUnit({...newUnit, propertyId: val || ""})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

      {/* Table of units */}
      <Card className="border border-slate-200 shadow-none bg-white rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">Property / Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rent Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right px-5">Adjust Rent Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map(unit => {
                const prop = properties.find(p => p.id === unit.propertyId);
                return (
                  <TableRow key={unit.id} className="hover:bg-slate-50/50">
                    <TableCell className="px-5 py-3.5">
                      <span className="font-semibold text-slate-900 text-xs">Unit {unit.unitNumber}</span>
                      <span className="text-[10px] text-slate-400 font-medium block">{prop?.name}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{unit.type}</TableCell>
                    <TableCell className="font-bold text-slate-800 text-xs">
                      {unit.rentAmount.toLocaleString()} {currency}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("shadow-none font-bold uppercase text-[9px] px-2 py-0.5 rounded", 
                        unit.status === "VACANT" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-slate-50 text-slate-700 border border-slate-200"
                      )}>
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-5">
                      <Input 
                        type="number"
                        className="h-8 text-xs w-28 ml-auto text-right"
                        defaultValue={unit.rentAmount}
                        onBlur={e => {
                          const val = parseFloat(e.target.value) || 0;
                          if (val !== unit.rentAmount) {
                            handleUpdateRent(unit.id, val);
                          }
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {units.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center p-8 text-slate-400 text-xs">No units created in sandbox.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
