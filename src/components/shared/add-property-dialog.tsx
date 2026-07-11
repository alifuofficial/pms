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

  const [lateFeeOverride, setLateFeeOverride] = useState(false);
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState("5");
  const [lateFeePercentage, setLateFeePercentage] = useState("5.0");
  const [rulesList, setRulesList] = useState<{ days: number; percentage: number }[]>([]);

  const addRule = () => {
    setRulesList([...rulesList, { days: 15, percentage: 10.0 }]);
  };
  const updateRule = (index: number, field: "days" | "percentage", val: number) => {
    const updated = [...rulesList];
    updated[index] = { ...updated[index], [field]: val };
    setRulesList(updated);
  };
  const removeRule = (index: number) => {
    setRulesList(rulesList.filter((_, i) => i !== index));
  };

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
    const result = await createProperty({
      name: formData.name,
      address: formData.address,
      type: formData.type as any,
      managerId: formData.managerId,
      accountantId: formData.accountantId || undefined,
      lateFeeEnabled: lateFeeOverride,
      lateFeeGraceDays: lateFeeOverride ? parseInt(lateFeeGraceDays) : null,
      lateFeePercentage: lateFeeOverride ? parseFloat(lateFeePercentage) : null,
      incrementalRules: lateFeeOverride && rulesList.length > 0 ? JSON.stringify(rulesList) : null,
    } as any);
    setIsLoading(false);
    
    if (result.success) {
      toast.success("Property registered successfully.");
      setOpen(false);
      setFormData({ name: "", address: "", type: "RESIDENTIAL", managerId: "", accountantId: "" });
      setLateFeeOverride(false);
      setLateFeeGraceDays("5");
      setLateFeePercentage("5.0");
      setRulesList([]);
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

          {/* Custom Late Fee Rules Override */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="lateFeeOverride"
                checked={lateFeeOverride}
                onChange={(e) => setLateFeeOverride(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <Label htmlFor="lateFeeOverride" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                Override Late Fee Policy for this Property
              </Label>
            </div>

            {lateFeeOverride && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-3 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-semibold uppercase text-slate-400">Grace Days</Label>
                    <Input 
                      type="number"
                      min="0"
                      value={lateFeeGraceDays}
                      onChange={(e) => setLateFeeGraceDays(e.target.value)}
                      className="rounded-lg border-slate-200 bg-white h-9 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-semibold uppercase text-slate-400">Base Penalty %</Label>
                    <Input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={lateFeePercentage}
                      onChange={(e) => setLateFeePercentage(e.target.value)}
                      className="rounded-lg border-slate-200 bg-white h-9 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] font-semibold uppercase text-slate-400">Incremental Tiers</Label>
                    <button
                      type="button"
                      onClick={addRule}
                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase"
                    >
                      + Add Tier
                    </button>
                  </div>

                  {rulesList.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic font-medium">No incremental rules added. Penalty stays flat.</p>
                  ) : (
                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                      {rulesList.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                          <span className="text-[10px] text-slate-500 font-medium shrink-0">After</span>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="Days"
                            value={rule.days}
                            onChange={(e) => updateRule(idx, "days", parseInt(e.target.value) || 0)}
                            className="w-16 rounded-lg border-slate-200 bg-white h-8 text-xs font-medium text-center"
                          />
                          <span className="text-[10px] text-slate-500 font-medium shrink-0">days, set to</span>
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="%"
                            value={rule.percentage}
                            onChange={(e) => updateRule(idx, "percentage", parseFloat(e.target.value) || 0)}
                            className="w-16 rounded-lg border-slate-200 bg-white h-8 text-xs font-medium text-center"
                          />
                          <span className="text-[10px] text-slate-500 font-medium">%</span>
                          <button
                            type="button"
                            onClick={() => removeRule(idx)}
                            className="text-[10px] font-semibold text-red-500 hover:text-red-700 ml-auto"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
