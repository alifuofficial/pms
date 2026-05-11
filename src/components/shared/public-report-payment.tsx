"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Camera, 
  ChevronRight,
  User,
  Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reportPublicPayment } from "@/lib/actions/public";
import { toast } from "sonner";
import { format } from "date-fns";

interface PublicReportPaymentProps {
  unitId: string;
  unitNumber: string;
  status: string;
  nextMonth?: string;
  nextMonthAmharic?: string;
  rentAmount: number;
  currentPenalty: number;
  historicalPenalty: number;
  currency: string;
  grandTotal?: number;    // Total across ALL overdue months
  arrearsCount?: number;  // Number of overdue months
}

export function PublicReportPayment({ 
  unitId, 
  unitNumber, 
  status, 
  nextMonth, 
  nextMonthAmharic,
  rentAmount,
  currentPenalty,
  historicalPenalty,
  currency,
  grandTotal = 0,
  arrearsCount = 0
}: PublicReportPaymentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentType, setPaymentType] = useState<"MONTHLY" | "ADVANCE">("MONTHLY");
  const [advanceMonths, setAdvanceMonths] = useState(1);
  const [fileName, setFileName] = useState<string | null>(null);

  const totalPenalty = currentPenalty + historicalPenalty;
  const hasArrears = arrearsCount > 0 && grandTotal > 0;
  const advanceRentTotal = rentAmount * advanceMonths;

  // Smart calculation:
  // - If arrears exist + Monthly → pay off all arrears (grandTotal)
  // - If arrears exist + Advance → pay off all arrears PLUS N future months rent
  // - If no arrears + Monthly   → rent + penalty
  // - If no arrears + Advance   → rent × N + penalty
  let calculatedAmount = 0;
  if (hasArrears) {
    calculatedAmount = paymentType === "ADVANCE"
      ? grandTotal + advanceRentTotal   // Clear debt + prepay N months
      : grandTotal;                     // Clear debt only
  } else if (paymentType === "ADVANCE") {
    calculatedAmount = advanceRentTotal + totalPenalty;
  } else {
    calculatedAmount = rentAmount + totalPenalty;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    // Total months covered = all arrears + any additional advance months
    const totalMonths = hasArrears 
      ? (paymentType === "ADVANCE" ? (arrearsCount + advanceMonths) : arrearsCount)
      : (paymentType === "ADVANCE" ? advanceMonths : 1);

    formData.append("unitId", unitId);
    formData.append("amount", calculatedAmount.toString());
    formData.append("paymentType", paymentType);
    formData.append("advanceMonths", totalMonths.toString());

    try {
      const result = await reportPublicPayment(formData);
      if (result.success) {
        setSubmitted(true);
        toast.success("Payment report submitted for review.");
      } else {
        toast.error(result.error || "Failed to submit report.");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] p-10 text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight">REPORT SUBMITTED</h3>
          <p className="text-xs font-bold text-emerald-700/70 leading-relaxed uppercase tracking-widest">
            The accountant has been notified. Your status will update once the transaction is verified.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            setSubmitted(false);
            setIsOpen(false);
          }}
          className="rounded-xl border-emerald-200 text-emerald-700 font-black text-[10px] uppercase tracking-widest px-8"
        >
          Return to Status
        </Button>
      </div>
    );
  }

  if (!isOpen) {
    const isPaid = status === "PAID";
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full bg-slate-900 rounded-[2rem] p-4 flex items-center justify-between group hover:shadow-2xl hover:shadow-slate-900/20 active:scale-[0.98] transition-all duration-500 overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-4 relative z-10">
           <div className={cn(
             "w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110",
             isPaid ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white/10 text-white"
           )}>
              <CreditCard size={18} />
           </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">
                {hasArrears ? "Urgent Action" : "Payment Hub"}
              </p>
              <p className="text-xs font-black text-white uppercase tracking-tight">
                {hasArrears ? `Settle ${arrearsCount} Overdue ${arrearsCount === 1 ? "Month" : "Months"}` : "Pay for Next Month"}
              </p>
            </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors relative z-10">
           <ChevronRight size={16} className="text-white" />
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Payment Node</p>
          <h3 className="text-xl font-black tracking-tight uppercase">Submit Evidence</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
          <ChevronRight size={20} className="rotate-90" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {/* Payment Logic Engine */}
        <div className="space-y-4">
           <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button 
                type="button"
                onClick={() => setPaymentType("MONTHLY")}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  paymentType === "MONTHLY" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {hasArrears ? "Clear Arrears" : "Standard"}
              </button>
              <button 
                type="button"
                onClick={() => setPaymentType("ADVANCE")}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  paymentType === "ADVANCE" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {hasArrears ? "Clear + Advance" : "Advance"}
              </button>
           </div>

           <div className="p-6 rounded-[2rem] space-y-4 relative overflow-hidden transition-colors duration-500 bg-slate-900 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                 <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">
                   Calculated Total
                 </p>
                 <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-white/40">{currency}</span>
                    <h4 className="text-4xl font-black tracking-tighter tabular-nums">{calculatedAmount.toLocaleString()}</h4>
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                    {/* Arrears line — shown when tenant has debt */}
                    {hasArrears && (
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-rose-400">
                         <span>Arrears Owed ({arrearsCount} {arrearsCount === 1 ? "month" : "months"})</span>
                         <span>{currency} {grandTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {/* Single month rent — shown when no arrears */}
                    {!hasArrears && (
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                         <span>Month Rent</span>
                         <span>{currency} {rentAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {/* Advance months line */}
                    {paymentType === "ADVANCE" && (
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-blue-300">
                         <span>Advance ({advanceMonths} {advanceMonths === 1 ? "month" : "months"} × {currency} {rentAmount.toLocaleString()})</span>
                         <span>{currency} {advanceRentTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {/* Penalty line — shown when no arrears but has single penalty */}
                    {!hasArrears && totalPenalty > 0 && (
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-rose-400">
                         <span>Penalties Owed</span>
                         <span>{currency} {totalPenalty.toLocaleString()}</span>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           {paymentType === "ADVANCE" && (
             <div className="space-y-2 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Months in Advance</label>
                <div className="flex items-center gap-3">
                   <button 
                    type="button"
                    onClick={() => setAdvanceMonths(Math.max(1, advanceMonths - 1))}
                    className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xl hover:bg-slate-200 transition-colors"
                   >-</button>
                   <div className="flex-1 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-lg font-mono">
                      {advanceMonths}
                   </div>
                   <button 
                    type="button"
                    onClick={() => setAdvanceMonths(advanceMonths + 1)}
                    className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl hover:bg-slate-800 transition-colors"
                   >+</button>
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight text-center pt-1">
                   Total covers through {format(new Date(new Date().setMonth(new Date().getMonth() + advanceMonths)), "MMMM yyyy")}
                </p>
             </div>
           )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sender Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <Input 
                name="senderName"
                required
                placeholder="Name used in transaction"
                className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-bold focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction ID / Ref</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <Input 
                name="transactionId"
                required
                placeholder="TXN-XXXXXX"
                className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-bold focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Screenshot / Receipt</label>
            <div className="relative group">
              <input 
                type="file" 
                name="screenshot"
                accept="image/*"
                required
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              <div className={cn(
                "h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 z-10",
                fileName ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 group-hover:border-slate-300"
              )}>
                {fileName ? (
                  <>
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight truncate max-w-[200px]">{fileName}</span>
                  </>
                ) : (
                  <>
                    <Camera size={24} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attach Evidence</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <Button 
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Verify Transaction"}
        </Button>
        
        <div className="flex items-center justify-center gap-2 pt-2 opacity-30">
          <ShieldCheck size={12} />
          <p className="text-[8px] font-black uppercase tracking-[0.1em]">Secured Transmission</p>
        </div>
      </form>
    </div>
  );
}
