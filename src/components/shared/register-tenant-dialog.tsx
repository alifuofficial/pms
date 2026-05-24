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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  UserPlus, 
  Loader2, 
  Calendar, 
  Phone, 
  Mail, 
  Home, 
  FileText, 
  CreditCard, 
  ChevronRight, 
  ChevronLeft,
  Upload,
  CheckCircle2,
  Sparkles,
  Info
} from "lucide-react";
import { registerTenant } from "@/lib/actions/users";
import { getAvailableUnits, getProperties } from "@/lib/actions/properties";
import { uploadFile } from "@/lib/actions/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Kenat from "kenat";
import { getEthiopianYearRange, getEthiopianMonths, getDaysInEthiopianMonth } from "@/lib/calendar";

type Step = 1 | 2 | 3 | 4;

export function RegisterTenantDialog({ currency = "ETB" }: { currency?: string }) {

  const [open, setOpen] = useState(false);
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
    name: "",
    phoneNumber: "",
    email: "",
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
      if (!formData.name || !formData.phoneNumber) {
        toast.error("Please fill in required fields.");
        return;
      }
    }
    if (step === 2) {
      if (!formData.unitId) {
        toast.error("Please select a unit.");
        return;
      }
    }
    if (step === 3) {
      if (!formData.startDate && calendarType === "GREGORIAN") {
        toast.error("Please select lease start date.");
        return;
      }
      if (!formData.endDate && calendarType === "GREGORIAN") {
        toast.error("Please select lease end date.");
        return;
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
      // 1. Upload Files if present
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

      if (!receiptUrl && step === 4) {
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

      // 2. Process Dates
      let finalStartDate: Date;
      let finalEndDate: Date;
      let finalAdvanceUntil: Date | undefined;

      if (calendarType === "ETHIOPIAN") {
        const s = new Kenat({ year: ethStart.year, month: ethStart.month, day: ethStart.day }).getGregorian() as any;
        const e_ = new Kenat({ year: ethEnd.year, month: ethEnd.month, day: ethEnd.day }).getGregorian() as any;
        finalStartDate = new Date(Date.UTC(s.year, s.month - 1, s.day, 12, 0, 0));
        finalEndDate = new Date(Date.UTC(e_.year, e_.month - 1, e_.day, 12, 0, 0));

        if (formData.paymentType === "ADVANCE") {
          const a = new Kenat({ year: ethAdvance.year, month: ethAdvance.month, day: ethAdvance.day }).getGregorian() as any;
          finalAdvanceUntil = new Date(Date.UTC(a.year, a.month - 1, a.day, 12, 0, 0));
        }
      } else {
        const s = new Date(formData.startDate);
        const e = new Date(formData.endDate);
        finalStartDate = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), 12, 0, 0));
        finalEndDate = new Date(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate(), 12, 0, 0));
        if (formData.advanceUntil) {
          const a = new Date(formData.advanceUntil);
          finalAdvanceUntil = new Date(Date.UTC(a.getFullYear(), a.getMonth(), a.getDate(), 12, 0, 0));
        }
      }

      // 3. Register
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

      const result = await registerTenant({
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
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
        toast.success("Tenant registered and payment sent for approval.");
        setOpen(false);
        resetForm();
      } else {
        toast.error(result.error || "Registration failed.");
      }
    } catch (err) {
      toast.error("An error occurred during registration.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phoneNumber: "",
      email: "",
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
    <div className="flex items-center justify-between px-6 py-3 bg-slate-50/50 border-y border-slate-100">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex flex-col items-center gap-1 relative">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all relative z-10",
            step === s ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : 
            step > s ? "bg-emerald-500 text-white" : "bg-white text-slate-400 border border-slate-200"
          )}>
            {step > s ? <CheckCircle2 size={12} /> : s}
          </div>
          <span className={cn(
            "text-[8px] font-bold uppercase tracking-widest whitespace-nowrap",
            step === s ? "text-indigo-600" : step > s ? "text-emerald-600" : "text-slate-400"
          )}>
            {s === 1 ? "Identity" : s === 2 ? "Unit" : s === 3 ? "Lease" : "Payment"}
          </span>
          {s < 4 && (
            <div className={cn(
              "absolute top-3 left-[120%] w-[100%] h-[1px] -translate-y-1/2 hidden sm:block",
              step > s ? "bg-emerald-200" : "bg-slate-100"
            )} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <Button className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-4 shadow-none uppercase tracking-wider">
            <UserPlus className="mr-2 h-3.5 w-3.5" /> Register Tenant
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[550px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-5 pb-3 bg-white shrink-0">
          <div className="flex items-center gap-2">
             <DialogTitle className="text-lg font-bold text-slate-900">
                New Tenant Enrollment
             </DialogTitle>
             <span className="text-[10px] font-medium text-slate-300">/</span>
             <p className="text-[11px] font-medium text-slate-500">
               Step {step} of 4
             </p>
          </div>
          <DialogDescription className="text-[11px] font-medium text-slate-400">
            Complete the following steps to onboard a new resident.
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}
        
        <ScrollArea className="flex-1 overflow-y-auto bg-white">
          <div className="p-6">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Personal Identification</Label>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-700">Full Legal Name *</Label>
                      <Input 
                        required
                        placeholder="Ex: John Alexander Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="rounded-xl border-slate-200 h-12 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-100 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-700">Phone Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                          <Input 
                            required
                            placeholder="+251..."
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="rounded-xl border-slate-200 h-12 pl-12 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-100 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-700">Email Address (Optional)</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                          <Input 
                            type="email"
                            placeholder="tenant@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="rounded-xl border-slate-200 h-12 pl-12 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-100 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <Info size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Ensure the phone number is active as it will be used for automated SMS notifications and portal access.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Property Selection</Label>
                    <select 
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white h-12 px-4 text-sm font-semibold outline-none shadow-sm focus:ring-2 focus:ring-indigo-50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                      value={formData.propertyId}
                      onChange={(e) => setFormData({ ...formData, propertyId: e.target.value, unitId: "" })}
                    >
                      <option value="">Choose a property...</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Unit Assignment</Label>
                    <select 
                      required
                      disabled={!formData.propertyId}
                      className="w-full rounded-xl border border-slate-200 bg-white h-12 px-4 text-sm font-semibold outline-none shadow-sm focus:ring-2 focus:ring-indigo-50 focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:bg-slate-50"
                      value={formData.unitId}
                      onChange={(e) => {
                        const unit = filteredUnits.find(u => u.id === e.target.value);
                        setFormData({ ...formData, unitId: e.target.value, amount: unit?.rentAmount?.toString() || "" });
                      }}
                    >
                      <option value="">{formData.propertyId ? "Select a vacant unit..." : "Select property first"}</option>
                      {filteredUnits.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          Unit {unit.unitNumber} - {unit.type} ({unit.rentAmount.toLocaleString()} {currency}/mo)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {formData.unitId && (
                  <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3 shadow-sm">
                    <div className="p-2 bg-emerald-500 rounded-lg text-white">
                      <Home size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-emerald-900">Unit Verified</p>
                      <p className="text-[11px] text-emerald-600 font-medium">Ready for lease. Standard rent is {currency} {formData.amount}.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Lease Duration (Ethiopian Calendar)</Label>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-tight flex items-center gap-1.5">
                        <Calendar size={14} className="text-indigo-400" /> Start Date
                      </Label>
                      <div className="flex gap-1.5">
                        <select 
                          value={ethStart.year} 
                          onChange={e => setEthStart({...ethStart, year: parseInt(e.target.value)})}
                          className="w-1/3 rounded-xl border border-slate-200 bg-white h-12 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-50"
                        >
                          {getEthiopianYearRange().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select 
                          value={ethStart.month} 
                          onChange={e => setEthStart({...ethStart, month: parseInt(e.target.value)})}
                          className="w-1/3 rounded-xl border border-slate-200 bg-white h-12 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-50"
                        >
                          {getEthiopianMonths().map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                        </select>
                        <select 
                          value={ethStart.day} 
                          onChange={e => setEthStart({...ethStart, day: parseInt(e.target.value)})}
                          className="w-1/3 rounded-xl border border-slate-200 bg-white h-12 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-50"
                        >
                          {Array.from({length: getDaysInEthiopianMonth(ethStart.year, ethStart.month)}).map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-tight flex items-center gap-1.5">
                        <Calendar size={14} className="text-red-400" /> End Date
                      </Label>
                      <div className="flex gap-1.5">
                        <select 
                          value={ethEnd.year} 
                          onChange={e => setEthEnd({...ethEnd, year: parseInt(e.target.value)})}
                          className="w-1/3 rounded-xl border border-slate-200 bg-white h-12 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-50"
                        >
                          {getEthiopianYearRange().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select 
                          value={ethEnd.month} 
                          onChange={e => setEthEnd({...ethEnd, month: parseInt(e.target.value)})}
                          className="w-1/3 rounded-xl border border-slate-200 bg-white h-12 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-50"
                        >
                          {getEthiopianMonths().map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                        </select>
                        <select 
                          value={ethEnd.day} 
                          onChange={e => setEthEnd({...ethEnd, day: parseInt(e.target.value)})}
                          className="w-1/3 rounded-xl border border-slate-200 bg-white h-12 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-50"
                        >
                          {Array.from({length: getDaysInEthiopianMonth(ethEnd.year, ethEnd.month)}).map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Lease Documentation (Optional)</Label>
                  <div 
                    className={cn(
                      "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer shadow-sm",
                      leaseFile ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20"
                    )}
                    onClick={() => document.getElementById('lease-upload')?.click()}
                  >
                    <input 
                      id="lease-upload"
                      type="file" 
                      className="hidden" 
                      accept=".pdf,image/*"
                      onChange={(e) => setLeaseFile(e.target.files?.[0] || null)}
                    />
                    {leaseFile ? (
                      <>
                        <div className="p-3 bg-white rounded-xl shadow-md">
                          <FileText className="text-emerald-500" size={32} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-emerald-900">{leaseFile.name}</p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-1">Ready for upload</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                          <Upload className="text-slate-400" size={32} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-700">Attach Agreement (Optional)</p>
                          <p className="text-[10px] text-slate-400 font-medium">Click or drag & drop PDF or Image</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Initial Amount</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-slate-400 text-[11px] font-black uppercase">{currency}</span>
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="rounded-xl border-slate-200 h-12 pl-12 text-sm font-bold shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Billing Cycle</Label>
                    <select 
                      className="w-full rounded-xl border border-slate-200 bg-white h-12 px-4 text-sm font-bold outline-none shadow-sm focus:ring-2 focus:ring-indigo-50"
                      value={formData.paymentType}
                      onChange={(e) => {
                        const newType = e.target.value as "MONTHLY" | "ADVANCE";
                        if (newType === "MONTHLY") {
                          const unit = availableUnits.find(u => u.id === formData.unitId);
                          setFormData({ ...formData, paymentType: newType, amount: unit?.rentAmount?.toString() || formData.amount });
                          setAdvanceMonths("");
                        } else {
                          setFormData({ ...formData, paymentType: newType });
                        }
                      }}
                    >
                      <option value="MONTHLY">Regular Monthly</option>
                      <option value="ADVANCE">Advance Payment</option>
                    </select>
                  </div>
                </div>

                {formData.paymentType === "ADVANCE" && (
                  <div className="space-y-3 p-5 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in duration-300">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Number of Months *</Label>
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
                            const unit = availableUnits.find(u => u.id === formData.unitId);
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
                        className="rounded-xl border-indigo-200 h-12 text-sm font-bold shadow-sm focus:border-indigo-500 focus:ring-indigo-100"
                      />
                    </div>
                    {advanceMonths && parseInt(advanceMonths) >= 2 && (() => {
                      const unit = availableUnits.find(u => u.id === formData.unitId);
                      const rentAmount = unit?.rentAmount || 0;
                      const totalAmount = rentAmount * parseInt(advanceMonths);
                      const advMonthName = getEthiopianMonths().find(m => m.id === ethAdvance.month)?.name.split(' ')[0];
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[11px] text-indigo-700 font-semibold bg-indigo-100 rounded-xl px-3 py-2">
                            <Sparkles size={14} />
                            <span>{parseInt(advanceMonths)} months &times; {currency} {rentAmount.toLocaleString()} = {currency} {totalAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-indigo-600 font-medium">
                            <Calendar size={14} />
                            <span>Valid until: {advMonthName} {ethAdvance.day}, {ethAdvance.year}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Payment Proof</Label>
                  <div 
                    className={cn(
                      "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer shadow-sm",
                      receiptFile ? "border-blue-200 bg-blue-50/40" : "border-slate-200 hover:border-blue-200 hover:bg-blue-50/20"
                    )}
                    onClick={() => document.getElementById('receipt-upload')?.click()}
                  >
                    <input 
                      id="receipt-upload"
                      type="file" 
                      className="hidden" 
                      accept="image/*,.pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    />
                    {receiptFile ? (
                      <>
                        <div className="p-3 bg-white rounded-xl shadow-md">
                          <CreditCard className="text-blue-500" size={32} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-blue-900">{receiptFile.name}</p>
                          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight mt-1">Receipt Verified</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                          <Upload className="text-slate-400" size={32} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-700">Upload Receipt</p>
                          <p className="text-[10px] text-slate-400 font-medium">Bank transfer or physical receipt image</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-5 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100 flex items-center justify-between shrink-0">
          <Button 
            type="button" 
            variant="ghost"
            onClick={step === 1 ? () => setOpen(false) : handleBack}
            className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all"
          >
            {step === 1 ? "Discard" : <><ChevronLeft size={14} className="mr-1.5" /> Back</>}
          </Button>
          
          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Button 
                type="button" 
                onClick={handleNext}
                className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                Next <ChevronRight size={14} className="ml-1.5" />
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={handleSubmit}
                disabled={isLoading}
                className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 size={14} className="mr-2" /> Finish</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
