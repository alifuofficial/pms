"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  Calendar, 
  Home, 
  Check, 
  Edit, 
  X,
  Clock
} from "lucide-react";
import { updateLeaseDates } from "@/lib/actions/users";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Kenat from "kenat";
import { 
  getEthiopianYearRange, 
  getEthiopianMonths, 
  getDaysInEthiopianMonth, 
  toEthiopian,
  formatSystemDate 
} from "@/lib/calendar";

interface ManageLeasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  leases: any[];
}

export function ManageLeasesDialog({ 
  open, 
  onOpenChange, 
  tenantId, 
  tenantName, 
  leases = [] 
}: ManageLeasesDialogProps) {
  const [editingLeaseId, setEditingLeaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Date selection states
  const [ethStart, setEthStart] = useState({ year: 0, month: 0, day: 0 });
  const [ethEnd, setEthEnd] = useState({ year: 0, month: 0, day: 0 });

  // Initialize edit inputs when entering edit mode
  const startEditing = (lease: any) => {
    const startEt = toEthiopian(new Date(lease.startDate));
    const endEt = toEthiopian(new Date(lease.endDate));
    setEthStart({ year: startEt.year, month: startEt.month, day: startEt.day });
    setEthEnd({ year: endEt.year, month: endEt.month, day: endEt.day });
    setEditingLeaseId(lease.id);
  };

  const cancelEditing = () => {
    setEditingLeaseId(null);
  };

  const handleSave = async (leaseId: string) => {
    setIsLoading(true);
    try {
      const s = new Kenat(`${ethStart.year}/${ethStart.month}/${ethStart.day}`).getGregorian() as any;
      const e = new Kenat(`${ethEnd.year}/${ethEnd.month}/${ethEnd.day}`).getGregorian() as any;
      const finalStartDate = new Date(s.year, s.month - 1, s.day);
      const finalEndDate = new Date(e.year, e.month - 1, e.day);

      if (finalStartDate >= finalEndDate) {
        toast.error("Start date must be before end date.");
        setIsLoading(false);
        return;
      }

      const result = await updateLeaseDates(leaseId, finalStartDate, finalEndDate);
      if (result.success) {
        toast.success("Lease dates updated successfully.");
        setEditingLeaseId(null);
      } else {
        toast.error(result.error || "Failed to update lease dates.");
      }
    } catch (err) {
      toast.error("Failed to parse selected dates.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Calendar size={18} />
            </div>
            Manage Leases - {tenantName}
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500">
            View and adjust lease dates or correct mistakes in onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
          {leases.length > 0 ? (
            leases.map((lease) => {
              const isEditing = editingLeaseId === lease.id;
              return (
                <div key={lease.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Home size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Unit {lease.unit.unitNumber}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{lease.unit.property.name}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                      lease.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {lease.status}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="pt-3 border-t border-slate-200/60 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Start Date</Label>
                          <div className="flex gap-1">
                            <select 
                              value={ethStart.year} 
                              onChange={e => setEthStart({...ethStart, year: parseInt(e.target.value)})}
                              className="w-1/3 rounded-lg border border-slate-200 bg-white h-9 px-1 text-[11px] outline-none"
                            >
                              {getEthiopianYearRange().map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select 
                              value={ethStart.month} 
                              onChange={e => setEthStart({...ethStart, month: parseInt(e.target.value)})}
                              className="w-1/3 rounded-lg border border-slate-200 bg-white h-9 px-1 text-[11px] outline-none"
                            >
                              {getEthiopianMonths().map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                            </select>
                            <select 
                              value={ethStart.day} 
                              onChange={e => setEthStart({...ethStart, day: parseInt(e.target.value)})}
                              className="w-1/3 rounded-lg border border-slate-200 bg-white h-9 px-1 text-[11px] outline-none"
                            >
                              {Array.from({length: getDaysInEthiopianMonth(ethStart.year, ethStart.month)}).map((_, i) => (
                                <option key={i+1} value={i+1}>{i+1}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold text-slate-400 uppercase">End Date</Label>
                          <div className="flex gap-1">
                            <select 
                              value={ethEnd.year} 
                              onChange={e => setEthEnd({...ethEnd, year: parseInt(e.target.value)})}
                              className="w-1/3 rounded-lg border border-slate-200 bg-white h-9 px-1 text-[11px] outline-none"
                            >
                              {getEthiopianYearRange().map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select 
                              value={ethEnd.month} 
                              onChange={e => setEthEnd({...ethEnd, month: parseInt(e.target.value)})}
                              className="w-1/3 rounded-lg border border-slate-200 bg-white h-9 px-1 text-[11px] outline-none"
                            >
                              {getEthiopianMonths().map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                            </select>
                            <select 
                              value={ethEnd.day} 
                              onChange={e => setEthEnd({...ethEnd, day: parseInt(e.target.value)})}
                              className="w-1/3 rounded-lg border border-slate-200 bg-white h-9 px-1 text-[11px] outline-none"
                            >
                              {Array.from({length: getDaysInEthiopianMonth(ethEnd.year, ethEnd.month)}).map((_, i) => (
                                <option key={i+1} value={i+1}>{i+1}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg"
                          onClick={cancelEditing}
                          disabled={isLoading}
                        >
                          <X size={12} className="mr-1" /> Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                          onClick={() => handleSave(lease.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />} Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-slate-700">
                          {formatSystemDate(new Date(lease.startDate), "ETHIOPIAN")} - {formatSystemDate(new Date(lease.endDate), "ETHIOPIAN")}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium">
                          Gregorian: {new Date(lease.startDate).toLocaleDateString()} to {new Date(lease.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200/80 px-3"
                        onClick={() => startEditing(lease)}
                      >
                        <Edit size={12} className="mr-1" /> Edit Month
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2">
              <Clock size={24} className="mx-auto" />
              <p className="text-xs font-semibold uppercase tracking-wider">No Active or Pending Leases</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
