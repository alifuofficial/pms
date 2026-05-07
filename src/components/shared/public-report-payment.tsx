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

interface PublicReportPaymentProps {
  unitId: string;
  unitNumber: string;
  status: string;
  nextMonth?: string;
  nextMonthAmharic?: string;
}

export function PublicReportPayment({ unitId, unitNumber, status, nextMonth, nextMonthAmharic }: PublicReportPaymentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append("unitId", unitId);

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
          onClick={() => setSubmitted(false)}
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
               {isPaid ? "Advance Payment" : "Quick Action"}
             </p>
             <p className="text-xs font-black text-white uppercase tracking-tight">
               {isPaid ? "Pay for Next Month" : "Report New Payment"}
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
        {nextMonth && (
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Target Month</p>
              <p className="text-xs font-black text-indigo-900 uppercase tracking-tight">{nextMonth}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-indigo-600">{nextMonthAmharic}</p>
            </div>
          </div>
        )}
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
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50 group-hover:border-slate-300 transition-colors">
                <Camera size={24} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attach Evidence</span>
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
