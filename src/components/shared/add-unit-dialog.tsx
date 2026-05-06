"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Building2 } from "lucide-react";
import { createUnit, getProperties } from "@/lib/actions/properties";
import { toast } from "sonner";

export function AddUnitDialog({ 
  propertyId: initialPropertyId, 
  propertyName: initialPropertyName,
  trigger
}: { 
  propertyId?: string, 
  propertyName?: string,
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<{ id: string, name: string }[]>([]);
  
  const [formData, setFormData] = useState({
    propertyId: initialPropertyId || "",
    unitNumber: "",
    floor: "",
    size: "",
    type: "Studio",
    rentAmount: "",
  });

  useEffect(() => {
    if (open && !initialPropertyId) {
      const fetchProps = async () => {
        const props = await getProperties();
        setProperties(props);
      };
      fetchProps();
    }
  }, [open, initialPropertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyId) {
      toast.error("Please select a property.");
      return;
    }
    if (!formData.rentAmount) {
      toast.error("Monthly price is mandatory.");
      return;
    }
    
    setIsLoading(true);
    const result = await createUnit(formData.propertyId, {
      unitNumber: formData.unitNumber,
      floor: parseInt(formData.floor) || 0,
      size: parseFloat(formData.size) || 0,
      type: formData.type,
      rentAmount: parseFloat(formData.rentAmount),
    });
    setIsLoading(false);
    
    if (result.success) {
      toast.success("Unit added successfully.");
      setOpen(false);
      setFormData({ 
        propertyId: initialPropertyId || "", 
        unitNumber: "", 
        floor: "", 
        size: "", 
        type: "Studio", 
        rentAmount: "" 
      });
    } else {
      toast.error(result.error || "Failed to add unit.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-blue-600 hover:bg-blue-50">
            <Plus size={14} className="mr-1" /> Add Unit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900">Add Unit</DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500">
            {initialPropertyName ? `Adding unit to ${initialPropertyName}` : "Create a new rental unit inventory."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            {!initialPropertyId && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Target Property</Label>
                <select 
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                >
                  <option value="">Select Property...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Unit Number</Label>
                <Input 
                  required
                  placeholder="Ex: 101"
                  value={formData.unitNumber}
                  onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                  className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Floor</Label>
                <Input 
                  type="number"
                  placeholder="Ex: 1"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Size (m²)</Label>
                <Input 
                  type="number"
                  placeholder="Ex: 45"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Type</Label>
                <select 
                  className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Studio">Studio</option>
                  <option value="1BR">1 Bedroom</option>
                  <option value="2BR">2 Bedrooms</option>
                  <option value="3BR">3 Bedrooms</option>
                  <option value="Office">Office</option>
                  <option value="Retail">Retail</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Monthly Price (Mandatory)</Label>
              <Input 
                required
                type="number"
                placeholder="Ex: 1200"
                value={formData.rentAmount}
                onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
