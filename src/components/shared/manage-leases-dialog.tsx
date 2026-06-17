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
import { updateLeaseDates, terminateLease, updateLeaseUnit } from "@/lib/actions/users";
import { getAvailableUnits } from "@/lib/actions/properties";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [editingLeaseId, setEditingLeaseId] = useState<string | null>(null);
  const [confirmTerminateLeaseId, setConfirmTerminateLeaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [changingLeaseId, setChangingLeaseId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  useEffect(() => {
    if (open) {
      getAvailableUnits().then((units) => {
        setAvailableUnits(units || []);
      }).catch(err => {
        console.error("Failed to fetch available units:", err);
      });
    } else {
      setChangingLeaseId(null);
      setSelectedUnitId("");
    }
  }, [open]);

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
    setConfirmTerminateLeaseId(null);
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
        router.refresh();
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

  const handleTerminate = async (leaseId: string) => {
    setIsLoading(true);
    try {
      const result = await terminateLease(leaseId);
      if (result.success) {
        toast.success("Lease cancelled successfully.");
        setConfirmTerminateLeaseId(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to cancel lease.");
      }
    } catch (err) {
      toast.error("Failed to cancel lease.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeUnit = async (leaseId: string) => {
    if (!selectedUnitId) return;
    setIsLoading(true);
    try {
      const result = await updateLeaseUnit(leaseId, selectedUnitId);
      if (result.success) {
        toast.success("Lease unit updated successfully.");
        setChangingLeaseId(null);
        setSelectedUnitId("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update lease unit.");
      }
    } catch (err) {
      toast.error("Failed to update lease unit.");
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
                      "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                      lease.status === "ACTIVE" 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : lease.status === "PENDING"
                        ? "bg-amber-50 text-amber-600 border-amber-100"
                        : lease.status === "LOCKED_OUT"
                        ? "bg-red-50 text-red-600 border-red-100"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      {lease.status === "LOCKED_OUT" ? "locked out" : lease.status.toLowerCase()}
                    </span>
                  </div>

                  {lease.status === "LOCKED_OUT" || lease.status === "TERMINATED" ? (
                    <div className="pt-3 border-t border-slate-200/60 space-y-2.5">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lease Start</p>
                          <p className="font-semibold text-slate-800">{formatSystemDate(new Date(lease.startDate), "ETHIOPIAN")}</p>
                          <p className="text-[9px] text-slate-400 font-medium">Gregorian: {new Date(lease.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Original End</p>
                          <p className="font-semibold text-slate-800">{formatSystemDate(new Date(lease.endDate), "ETHIOPIAN")}</p>
                          <p className="text-[9px] text-slate-400 font-medium">Gregorian: {new Date(lease.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {lease.terminatedAt && (
                        <div className="pt-2 border-t border-slate-100/60">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {lease.status === "LOCKED_OUT" ? "Lockout Date" : "Termination Date"}
                          </p>
                          <p className={cn(
                            "text-xs font-black",
                            lease.status === "LOCKED_OUT" ? "text-red-600" : "text-slate-600"
                          )}>
                            {formatSystemDate(new Date(lease.terminatedAt), "ETHIOPIAN")}
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium">
                            Gregorian: {new Date(lease.terminatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : isEditing ? (
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
                  ) : changingLeaseId === lease.id ? (
                    <div className="pt-3 border-t border-slate-200/60 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Select New Unit</Label>
                        {availableUnits.length > 0 ? (
                          <select
                            value={selectedUnitId}
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-xs outline-none focus:border-blue-500 transition-all font-semibold"
                          >
                            <option value="">-- Choose Available Unit --</option>
                            {availableUnits.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.property.name} - Unit {u.unitNumber} ({u.type}, {u.rentAmount.toLocaleString()} ETB)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-[11px] font-medium">
                            No available units are currently configured in the system. Please vacate or create a unit first.
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg"
                          onClick={() => setChangingLeaseId(null)}
                          disabled={isLoading}
                        >
                          <X size={12} className="mr-1" /> Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => handleChangeUnit(lease.id)}
                          disabled={isLoading || !selectedUnitId}
                        >
                          {isLoading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />} Confirm
                        </Button>
                      </div>
                    </div>
                  ) : confirmTerminateLeaseId === lease.id ? (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-red-50/50 p-2.5 rounded-xl border border-red-100/60 animate-in fade-in duration-200">
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-tight">Cancel this lease?</span>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[9px] font-bold uppercase tracking-wider rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => setConfirmTerminateLeaseId(null)}
                          disabled={isLoading}
                        >
                          No
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-red-600 text-white hover:bg-red-700"
                          onClick={() => handleTerminate(lease.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 size={10} className="animate-spin mr-1" /> : <X size={10} className="mr-1" />} Yes, Cancel
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
                      <div className="flex gap-1.5">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-[10px] font-bold uppercase tracking-widest text-red-500 bg-white hover:bg-red-50 hover:text-red-600 rounded-lg border border-red-100 px-2.5"
                          onClick={() => {
                            setConfirmTerminateLeaseId(lease.id);
                            setEditingLeaseId(null);
                            setChangingLeaseId(null);
                          }}
                        >
                          Cancel Lease
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-white hover:bg-blue-50 rounded-lg border border-blue-100 px-2.5"
                          onClick={() => {
                            setChangingLeaseId(lease.id);
                            setEditingLeaseId(null);
                            setConfirmTerminateLeaseId(null);
                            setSelectedUnitId("");
                          }}
                        >
                          Change Unit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200/80 px-2.5"
                          onClick={() => {
                            startEditing(lease);
                            setChangingLeaseId(null);
                            setConfirmTerminateLeaseId(null);
                          }}
                        >
                          <Edit size={12} className="mr-1" /> Edit Month
                        </Button>
                      </div>
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
