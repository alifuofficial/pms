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
import { Plus, Building2, MapPin, User, Loader2 } from "lucide-react";
import { createProperty, getManagers, getAccountants } from "@/lib/actions/properties";
import { toast } from "sonner";

export function AddPropertyDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [accountants, setAccountants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    type: "RESIDENTIAL",
    managerId: "",
    accountantId: "",
  });

  useEffect(() => {
    if (open) {
      getManagers().then(setManagers);
      getAccountants().then(setAccountants);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.managerId) {
      toast.error("Please assign a manager to this property.");
      return;
    }
    
    setIsLoading(true);
    const result = await createProperty(formData as any);
    setIsLoading(false);
    
    if (result.success) {
      toast.success("Property registered successfully.");
      setOpen(false);
      setFormData({ name: "", address: "", type: "RESIDENTIAL", managerId: "", accountantId: "" });
    } else {
      toast.error(result.error || "Failed to register property.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <Button size="sm" className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-none font-medium">
            <Plus className="mr-2 h-3.5 w-3.5" /> Add Property
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900">Add Property</DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500">Register a new asset to the portfolio.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Property Name</Label>
              <Input 
                required
                placeholder="Ex: Nexus Heights"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Location</Label>
              <Input 
                required
                placeholder="Street address, City"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Type</Label>
                <select 
                  className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="BOTH">Mixed</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Manager</Label>
                <select 
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                >
                  <option value="">Select Manager...</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Accountant</Label>
              <select 
                className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                value={formData.accountantId}
                onChange={(e) => setFormData({ ...formData, accountantId: e.target.value })}
              >
                <option value="">Select Accountant (Optional)...</option>
                {accountants.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register Property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
