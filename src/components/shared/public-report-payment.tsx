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
  Hash,
  Building2,
  CalendarDays,
  Banknote
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
  bankAccounts: any[];    // List of active bank accounts
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
  arrearsCount = 0,
  bankAccounts = []
}: PublicReportPaymentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentType, setPaymentType] = useState<"MONTHLY" | "ADVANCE">("MONTHLY");
  const [advanceMonths, setAdvanceMonths] = useState(1);
  const [senderName, setSenderName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

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
      setScreenshotFile(file);
    } else {
      setFileName(null);
      setScreenshotFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!screenshotFile) {
      toast.error("Please upload your payment receipt screenshot.");
      return;
    }
    
    setLoading(true);
    
    const formData = new FormData();
    const totalMonths = hasArrears 
      ? (paymentType === "ADVANCE" ? (arrearsCount + advanceMonths) : arrearsCount)
      : (paymentType === "ADVANCE" ? advanceMonths : 1);

    formData.append("unitId", unitId);
    formData.append("amount", calculatedAmount.toString());
    formData.append("paymentType", paymentType);
    formData.append("advanceMonths", totalMonths.toString());
    formData.append("senderName", senderName);
    formData.append("transactionId", transactionId);
    if (screenshotFile) {
      formData.append("screenshot", screenshotFile);
    }

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

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId);

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
            setStep(1);
            setSelectedBankId(null);
            setSenderName("");
            setTransactionId("");
            setFileName(null);
            setScreenshotFile(null);
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
        onClick={() => {
          setIsOpen(true);
          setStep(1);
        }}
        className="w-full bg-slate-900 rounded-[2rem] p-4 flex items-center justify-between group hover:shadow-2xl hover:shadow-slate-900/20 active:scale-[0.98] transition-all duration-500 overflow-hidden relative text-white"
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
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-500 text-slate-800">
      {/* Dynamic Step Header */}
      <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Step {step} of 4</p>
          <h3 className="text-xl font-black tracking-tight uppercase">
            {step === 1 && "Select Bank"}
            {step === 2 && "Payment Amount"}
            {step === 3 && "Transaction Info"}
            {step === 4 && "Upload Receipt"}
          </h3>
        </div>
        <button 
          type="button"
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              setIsOpen(false);
            }
          }} 
          className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <ChevronRight size={20} className="rotate-180 text-white" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* STEP 1: Select Bank Account */}
        {step === 1 && (
          <div className="p-8 space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Choose bank to transfer funds:</p>
            <div className="space-y-3">
              {bankAccounts.length > 0 ? (
                bankAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      setSelectedBankId(account.id);
                      setStep(2);
                    }}
                    className={cn(
                      "w-full p-5 rounded-3xl border text-left flex items-center justify-between group hover:shadow-md transition-all duration-300 active:scale-[0.99]",
                      selectedBankId === account.id ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-900 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors",
                        selectedBankId === account.id ? "bg-white/15 text-white" : "bg-slate-900 text-white"
                      )}>
                        <p className="text-xs font-black">{account.bankName.slice(0, 2).toUpperCase()}</p>
                      </div>
                      <div>
                        <p className={cn("text-[11px] font-black leading-none mb-1.5", selectedBankId === account.id ? "text-white" : "text-slate-900")}>{account.bankName}</p>
                        <p className={cn("text-xs font-bold tabular-nums", selectedBankId === account.id ? "text-white/60" : "text-slate-500")}>{account.accountNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-[9px] font-black uppercase tracking-tighter", selectedBankId === account.id ? "text-white/50" : "text-slate-350")}>{account.accountName}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Building2 size={24} className="text-slate-300 mx-auto" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Bank Accounts Configured</p>
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-[0.2em] transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {/* STEP 2: Payment Mode & Amount */}
        {step === 2 && (
          <div className="p-8 space-y-6 animate-in fade-in slide-in-from-right-5 duration-300">
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

            <div className="p-6 rounded-[2rem] space-y-4 relative overflow-hidden bg-slate-900 text-white shadow-xl shadow-slate-900/10">
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
                  {hasArrears && (
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-rose-450">
                      <span>Arrears Owed ({arrearsCount} {arrearsCount === 1 ? "month" : "months"})</span>
                      <span>{currency} {grandTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {!hasArrears && (
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                      <span>Month Rent</span>
                      <span>{currency} {rentAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {paymentType === "ADVANCE" && (
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-blue-300">
                      <span>Advance ({advanceMonths} {advanceMonths === 1 ? "month" : "months"} × {currency} {rentAmount.toLocaleString()})</span>
                      <span>{currency} {advanceRentTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {!hasArrears && totalPenalty > 0 && (
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-rose-450">
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
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight text-center pt-1 flex items-center justify-center gap-1.5">
                  <CalendarDays size={12} />
                  Covers through {format(new Date(new Date().setMonth(new Date().getMonth() + advanceMonths)), "MMMM yyyy")}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-[0.2em] transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Fill Transaction Details */}
        {step === 3 && (
          <div className="p-8 space-y-6 animate-in fade-in slide-in-from-right-5 duration-300">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sender Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <Input 
                    name="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
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
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    required
                    placeholder="TXN-XXXXXX"
                    className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-bold focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-[0.2em] transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!senderName.trim() || !transactionId.trim()}
                className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Upload Receipt / Pay */}
        {step === 4 && (
          <div className="p-8 space-y-6 animate-in fade-in slide-in-from-right-5 duration-300">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Screenshot / Receipt *</label>
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
                  "h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-350 z-10",
                  fileName ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 group-hover:border-slate-350"
                )}>
                  {fileName ? (
                    <>
                      <CheckCircle2 size={28} className="text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight truncate max-w-[200px]">{fileName}</span>
                    </>
                  ) : (
                    <>
                      <Camera size={28} className="text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attach Receipt Screenshot *</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Premium transaction summary box */}
            <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 text-xs space-y-2.5 text-slate-600 shadow-inner">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                <span className="font-bold flex items-center gap-1.5"><Building2 size={12} /> Target Bank:</span>
                <span className="font-black text-slate-900">{selectedBank ? selectedBank.bankName : "Selected Bank"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold flex items-center gap-1.5"><Banknote size={12} /> Total Amount:</span>
                <span className="font-black text-slate-900 text-sm">{currency} {calculatedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold flex items-center gap-1.5"><User size={12} /> Sender Name:</span>
                <span className="font-black text-slate-900 truncate max-w-[150px]">{senderName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold flex items-center gap-1.5"><Hash size={12} /> Transaction ID:</span>
                <span className="font-black text-slate-900 truncate max-w-[150px]">{transactionId}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-[0.2em] transition-all"
              >
                Back
              </button>
              <Button 
                type="submit"
                disabled={loading || !fileName}
                className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Pay Now"}
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-2 opacity-35 pt-1">
              <ShieldCheck size={12} />
              <p className="text-[8px] font-black uppercase tracking-[0.1em]">Secured Transmission</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
