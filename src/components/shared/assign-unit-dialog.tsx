"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus,
  Loader2, 
  Calendar, 
  Home, 
  FileText, 
  CreditCard, 
  ChevronRight, 
  ChevronLeft,
  Upload,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { assignUnitToTenant } from "@/lib/actions/users";
import { getAvailableUnits, getProperties } from "@/lib/actions/properties";
import { uploadFile } from "@/lib/actions/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Kenat from "kenat";
import { getEthiopianYearRange, getEthiopianMonths, getDaysInEthiopianMonth } from "@/lib/calendar";

type Step = 1 | 2 | 3;

export function AssignUnitDialog({ 
  tenantId, 
  tenantName, 
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  currency = "ETB"
}: { 
  tenantId: string, 
  tenantName: string, 
  trigger?: React.ReactNode,
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
  currency?: string
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  
  const [step, setStep] = useState<Step>(1);


  const [isLoading, setIsLoading] = useState(false);
  
  // Data States
  const [properties, setProperties] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<any[]>([]);
  
  // Form States
  const [calendarType] = useState<"GREGORIAN" | "ETHIOPIAN">("ETHIOPIAN");
  
  const todayEt = new Kenat(new Date()).getEthiopian();
  const [ethStart, setEthStart] = useState({ year: todayEt.year, month: todayEt.month, day: todayEt.day });
  const [ethEnd, setEthEnd] = useState({ year: todayEt.year + 1, month: todayEt.month, day: todayEt.day });
  const [ethAdvance, setEthAdvance] = useState({ year: todayEt.year, month: todayEt.month, day: todayEt.day });
  const [advanceMonths, setAdvanceMonths] = useState("");

  const [formData, setFormData] = useState({
    propertyId: "",
    unitId: "",
    startDate: "",
    endDate: "",
    leaseAgreementUrl: "",
    paymentType: "MONTHLY" as "MONTHLY" | "ADVANCE",
    amount: "",
    advanceUntil: "",
    receiptUrl: "",
  });

  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      getProperties().then(setProperties);
      getAvailableUnits().then(setAvailableUnits);
      setStep(1);
    }
  }, [open]);

  useEffect(() => {
    if (formData.propertyId) {
      setFilteredUnits(availableUnits.filter(u => u.propertyId === formData.propertyId));
    } else {
      setFilteredUnits([]);
    }
  }, [formData.propertyId, availableUnits]);

  const handleNext = () => {
    if (step === 1) {
      if (!formData.unitId) {
        toast.error("Please select a unit.");
        return;
      }
    }
    if (step === 2) {
      if (!formData.startDate || !formData.endDate) {
        if (calendarType === "GREGORIAN") {
          toast.error("Please select lease dates.");
          return;
        }
      }
    }
    setStep((prev) => (prev + 1) as Step);
  };

  const handleBack = () => {
    setStep((prev) => (prev - 1) as Step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let leaseUrl = formData.leaseAgreementUrl;
      let receiptUrl = formData.receiptUrl;

      if (leaseFile) {
        const upload = await uploadFile(leaseFile);
        if (upload.success) leaseUrl = upload.url!;
      }

      if (receiptFile) {
        const upload = await uploadFile(receiptFile);
        if (upload.success) receiptUrl = upload.url!;
      }

      if (!receiptUrl) {
        toast.error("Please upload payment receipt.");
        setIsLoading(false);
        return;
      }

      // Validation: Minimum 1 month payment
      const unit = availableUnits.find(u => u.id === formData.unitId);
      const rentAmount = unit?.rentAmount || 0;
      const paidAmount = parseFloat(formData.amount) || 0;

      if (paidAmount < rentAmount) {
        toast.error(`Minimum payment required: ${currency} ${rentAmount.toLocaleString()} (1 Month)`);
        setIsLoading(false);
        return;
      }

      let finalStartDate: Date;
      let finalEndDate: Date;
      let finalAdvanceUntil: Date | undefined;

      if (calendarType === "ETHIOPIAN") {
        const s = new Kenat(`${ethStart.year}/${ethStart.month}/${ethStart.day}`).getGregorian() as any;
        const e_ = new Kenat(`${ethEnd.year}/${ethEnd.month}/${ethEnd.day}`).getGregorian() as any;
        finalStartDate = new Date(s.year, s.month - 1, s.day);
        finalEndDate = new Date(e_.year, e_.month - 1, e_.day);

        if (formData.paymentType === "ADVANCE") {
          const a = new Kenat(`${ethAdvance.year}/${ethAdvance.month}/${ethAdvance.day}`).getGregorian() as any;
          finalAdvanceUntil = new Date(a.year, a.month - 1, a.day);
        }
      } else {
        finalStartDate = new Date(formData.startDate);
        finalEndDate = new Date(formData.endDate);
        if (formData.advanceUntil) finalAdvanceUntil = new Date(formData.advanceUntil);
      }

      // Validation: Advance Duration
      if (formData.paymentType === "ADVANCE") {
        const numMonths = parseInt(advanceMonths) || 0;
        if (numMonths < 2) {
          toast.error("Advance payment must be for at least 2 months.");
          setIsLoading(false);
          return;
        }
        if (finalAdvanceUntil && finalAdvanceUntil > finalEndDate) {
          toast.error("Advance payment cannot exceed lease end date.");
          setIsLoading(false);
          return;
        }
      }

      const result = await assignUnitToTenant({
        tenantId,
        unitId: formData.unitId,
        startDate: finalStartDate,
        endDate: finalEndDate,
        leaseAgreementUrl: leaseUrl,
        payment: {
          amount: parseFloat(formData.amount) || 0,
          type: formData.paymentType,
          advanceUntil: finalAdvanceUntil,
          receiptUrl: receiptUrl,
        }
      });

      if (result.success) {
        toast.success(`New unit assigned to ${tenantName}.`);
        setOpen(false);
        resetForm();
      } else {
        toast.error(result.error || "Operation failed.");
      }
    } catch (err) {
      toast.error("An error occurred.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      propertyId: "",
      unitId: "",
      startDate: "",
      endDate: "",
      leaseAgreementUrl: "",
      paymentType: "MONTHLY",
      amount: "",
      advanceUntil: "",
      receiptUrl: "",
    });
    setLeaseFile(null);
    setReceiptFile(null);
    setAdvanceMonths("");
    setStep(1);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between px-8 py-4 bg-slate-50/50 border-b border-slate-100">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
            step === s ? "bg-slate-900 text-white ring-4 ring-slate-100" : 
            step > s ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
          )}>
            {step > s ? <CheckCircle2 size={14} /> : s}
          </div>
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-tight",
            step === s ? "text-slate-900" : "text-slate-400"
          )}>
            {s === 1 ? "Unit" : s === 2 ? "Lease" : "Payment"}
          </span>
          {s < 3 && <div className="w-12 h-px bg-slate-200 mx-2" />}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger 
          render={trigger as React.ReactElement} 
        />
      )}


      <DialogContent className="sm:max-w-[550px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              {step === 1 && <Home size={18} />}
              {step === 2 && <FileText size={18} />}
              {step === 3 && <CreditCard size={18} />}
            </div>
            Assign Unit to {tenantName}
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500">
            Step {step} of 3: {step === 1 ? "Choose a vacant unit" : step === 2 ? "Lease terms" : "Initial payment"}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}
        
        <div className="p-8 min-h-[300px]">
          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Select Property *</Label>
                <select 
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white h-11 px-4 text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-slate-100"
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value, unitId: "" })}
                >
                  <option value="">Select a property...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Select Unit (Vacant Only) *</Label>
                <select 
                  required
                  disabled={!formData.propertyId}
                  className="w-full rounded-xl border border-slate-200 bg-white h-11 px-4 text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-slate-100 disabled:opacity-50"
                  value={formData.unitId}
                  onChange={(e) => {
                    const unit = filteredUnits.find(u => u.id === e.target.value);
                    setFormData({ ...formData, unitId: e.target.value, amount: unit?.rentAmount?.toString() || "" });
                  }}
                >
                  <option value="">{formData.propertyId ? "Choose a unit..." : "Select property first"}</option>
                  {filteredUnits.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      Unit {unit.unitNumber} - {unit.type} ({unit.rentAmount} {currency}/mo)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Lease Period (Ethiopian) *</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">Start Date</Label>
                  <div className="flex gap-1">
                    <select 
                      value={ethStart.year} 
                      onChange={e => setEthStart({...ethStart, year: parseInt(e.target.value)})}
                      className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                    >
                      {getEthiopianYearRange().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select 
                      value={ethStart.month} 
                      onChange={e => setEthStart({...ethStart, month: parseInt(e.target.value)})}
                      className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                    >
                      {getEthiopianMonths().map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                    </select>
                    <select 
                      value={ethStart.day} 
                      onChange={e => setEthStart({...ethStart, day: parseInt(e.target.value)})}
                      className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                    >
                      {Array.from({length: getDaysInEthiopianMonth(ethStart.year, ethStart.month)}).map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">End Date</Label>
                  <div className="flex gap-1">
                    <select 
                      value={ethEnd.year} 
                      onChange={e => setEthEnd({...ethEnd, year: parseInt(e.target.value)})}
                      className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                    >
                      {getEthiopianYearRange().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select 
                      value={ethEnd.month} 
                      onChange={e => setEthEnd({...ethEnd, month: parseInt(e.target.value)})}
                      className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                    >
                      {getEthiopianMonths().map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                    </select>
                    <select 
                      value={ethEnd.day} 
                      onChange={e => setEthEnd({...ethEnd, day: parseInt(e.target.value)})}
                      className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                    >
                      {Array.from({length: getDaysInEthiopianMonth(ethEnd.year, ethEnd.month)}).map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Lease Agreement (Optional)</Label>
                <div 
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                    leaseFile ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                  onClick={() => document.getElementById('lease-upload-assign')?.click()}
                >
                  <input 
                    id="lease-upload-assign"
                    type="file" 
                    className="hidden" 
                    accept=".pdf,image/*"
                    onChange={(e) => setLeaseFile(e.target.files?.[0] || null)}
                  />
                  {leaseFile ? (
                    <>
                      <FileText className="text-emerald-500" size={24} />
                      <p className="text-[10px] font-semibold text-emerald-900">{leaseFile.name}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="text-slate-400" size={24} />
                      <p className="text-[10px] font-semibold text-slate-600">Click to upload agreement</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase text-slate-400">Rent Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 text-sm font-bold">{currency}</span>
                    <Input 
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="rounded-xl border-slate-200 h-11 pl-12 text-sm shadow-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase text-slate-400">Payment Type *</Label>
                  <select 
                    className="w-full rounded-xl border border-slate-200 bg-white h-11 px-4 text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-slate-100"
                    value={formData.paymentType}
                    onChange={(e) => {
                      const newType = e.target.value as "MONTHLY" | "ADVANCE";
                      if (newType === "MONTHLY") {
                        const unit = filteredUnits.find(u => u.id === formData.unitId);
                        setFormData({ ...formData, paymentType: newType, amount: unit?.rentAmount?.toString() || formData.amount });
                        setAdvanceMonths("");
                      } else {
                        setFormData({ ...formData, paymentType: newType });
                      }
                    }}
                  >
                    <option value="MONTHLY">Monthly Rent</option>
                    <option value="ADVANCE">Advance Payment</option>
                  </select>
                </div>
              </div>

              {formData.paymentType === "ADVANCE" && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Number of Months *</Label>
                    <Input
                      type="number"
                      min="2"
                      placeholder="Enter months (minimum 2)"
                      value={advanceMonths}
                      onChange={(e) => {
                        const months = e.target.value;
                        setAdvanceMonths(months);
                        const numMonths = parseInt(months) || 0;
                        if (numMonths >= 2) {
                          const unit = filteredUnits.find(u => u.id === formData.unitId);
                          const rentAmount = unit?.rentAmount || 0;
                          setFormData(prev => ({ ...prev, amount: (rentAmount * numMonths).toString() }));
                          let newMonth = ethStart.month + numMonths;
                          let newYear = ethStart.year;
                          while (newMonth > 13) {
                            newMonth -= 13;
                            newYear++;
                          }
                          const maxDay = getDaysInEthiopianMonth(newYear, newMonth);
                          const newDay = Math.min(ethStart.day, maxDay);
                          setEthAdvance({ year: newYear, month: newMonth, day: newDay });
                        } else {
                          setFormData(prev => ({ ...prev, amount: "" }));
                        }
                      }}
                      className="rounded-lg border-slate-200 h-10 text-sm font-medium shadow-sm"
                    />
                  </div>
                  {advanceMonths && parseInt(advanceMonths) >= 2 && (() => {
                    const unit = filteredUnits.find(u => u.id === formData.unitId);
                    const rentAmount = unit?.rentAmount || 0;
                    const totalAmount = rentAmount * parseInt(advanceMonths);
                    const advMonthName = getEthiopianMonths().find(m => m.id === ethAdvance.month)?.name.split(' ')[0];
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-700 font-semibold bg-slate-100 rounded-lg px-3 py-2">
                          <Sparkles size={14} />
                          <span>{parseInt(advanceMonths)} months &times; {currency} {rentAmount.toLocaleString()} = {currency} {totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
                          <Calendar size={14} />
                          <span>Valid until: {advMonthName} {ethAdvance.day}, {ethAdvance.year}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Payment Receipt *</Label>
                <div 
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                    receiptFile ? "border-blue-200 bg-blue-50/30" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                  onClick={() => document.getElementById('receipt-upload-assign')?.click()}
                >
                  <input 
                    id="receipt-upload-assign"
                    type="file" 
                    className="hidden" 
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                  {receiptFile ? (
                    <>
                      <CreditCard className="text-blue-500" size={24} />
                      <p className="text-[10px] font-semibold text-blue-900">{receiptFile.name}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="text-slate-400" size={24} />
                      <p className="text-[10px] font-semibold text-slate-600">Click to upload receipt</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 flex items-center justify-between">
          <Button 
            type="button" 
            variant="ghost"
            onClick={step === 1 ? () => setOpen(false) : handleBack}
            className="h-10 rounded-xl text-xs font-bold text-slate-500"
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          
          <div className="flex items-center gap-3">
            {step < 3 ? (
              <Button 
                type="button" 
                onClick={handleNext}
                className="h-10 px-6 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Next Step
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={handleSubmit}
                disabled={isLoading}
                className="h-10 px-6 bg-emerald-600 text-white text-xs font-bold rounded-xl"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Complete Assignment"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
