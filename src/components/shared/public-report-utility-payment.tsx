"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Banknote,
  Zap,
  Droplet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reportUtilityPayment } from "@/lib/actions/utilities";
import { toast } from "sonner";

interface PublicReportUtilityPaymentProps {
  bill: {
    id: string;
    type: "ELECTRICITY" | "WATER";
    billingMonth: string;
    amount: number;
    usage: number;
    rate: number;
    previousReading: number | null;
    currentReading: number | null;
  };
  currency: string;
  bankAccounts: any[];
}

export function PublicReportUtilityPayment({ 
  bill, 
  currency, 
  bankAccounts = [] 
}: PublicReportUtilityPaymentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

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
    formData.append("billId", bill.id);
    formData.append("senderName", senderName);
    formData.append("transactionId", transactionId);
    if (selectedBankId) {
      formData.append("bankAccountId", selectedBankId);
    }
    formData.append("screenshot", screenshotFile);

    try {
      const result = await reportUtilityPayment(formData);
      if (result.success) {
        setSubmitted(true);
        toast.success("Utility payment receipt submitted for review.");
      } else {
        toast.error(result.error || "Failed to submit payment report.");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        // Reset states
        setStep(1);
        setSelectedBankId(null);
        setSenderName("");
        setTransactionId("");
        setFileName(null);
        setScreenshotFile(null);
        setSubmitted(false);
      }
    }}>
      <DialogTrigger render={
        <Button 
          size="sm"
          className="h-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider px-3 rounded-lg"
        >
          Pay Bill
        </Button>
      } />
      <DialogContent className="sm:max-w-[450px] p-0 border-none bg-white rounded-3xl overflow-hidden shadow-2xl">
        {submitted ? (
          <div className="bg-emerald-50 p-10 text-center space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight">RECEIPT SUBMITTED</h3>
              <p className="text-xs font-bold text-emerald-700/70 leading-relaxed uppercase tracking-widest">
                Our team will review your utility payment transaction reference shortly.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsOpen(false);
              }}
              className="rounded-xl border-emerald-200 text-emerald-700 font-black text-[10px] uppercase tracking-widest px-8"
            >
              Close
            </Button>
          </div>
        ) : (
          <div>
            {/* Step Header */}
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em]">Step {step} of 3</p>
                <h3 className="text-base font-black tracking-tight uppercase flex items-center gap-1.5">
                  {bill.type === "ELECTRICITY" ? <Zap size={14} className="text-yellow-400" /> : <Droplet size={14} className="text-blue-400" />}
                  {step === 1 && "Select Bank Account"}
                  {step === 2 && "Submit Reference"}
                  {step === 3 && "Upload Receipt"}
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
                className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={16} className="rotate-180 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* STEP 1: Select Bank */}
              {step === 1 && (
                <div className="p-6 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 mb-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Utility Bill Details</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{bill.billingMonth} - {bill.type === "ELECTRICITY" ? "Electricity" : "Water"}</span>
                      <span className="font-black text-slate-900">{bill.amount.toLocaleString()} {currency}</span>
                    </div>
                    {bill.previousReading !== null && bill.currentReading !== null && (
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Usage: {bill.usage.toLocaleString()} {bill.type === "ELECTRICITY" ? "kWh" : "m³"} ({bill.previousReading} → {bill.currentReading})
                      </p>
                    )}
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select bank for transfer:</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
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
                            "w-full p-4 rounded-2xl border text-left flex items-center justify-between group hover:shadow-sm transition-all duration-300 active:scale-[0.99]",
                            selectedBankId === account.id ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-900 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-colors",
                              selectedBankId === account.id ? "bg-white/15 text-white" : "bg-slate-900 text-white"
                            )}>
                              <p className="text-[10px] font-black">{account.bankName.slice(0, 2).toUpperCase()}</p>
                            </div>
                            <div>
                              <p className={cn("text-[10px] font-black leading-none mb-1", selectedBankId === account.id ? "text-white" : "text-slate-900")}>{account.bankName}</p>
                              <p className={cn("text-[10px] font-bold font-mono", selectedBankId === account.id ? "text-white/60" : "text-slate-500")}>{account.accountNumber}</p>
                            </div>
                          </div>
                          <p className={cn("text-[8px] font-black uppercase tracking-tighter", selectedBankId === account.id ? "text-white/50" : "text-slate-350")}>{account.accountName}</p>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Building2 size={20} className="text-slate-300 mx-auto" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Bank Accounts Configured</p>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="w-full h-11 rounded-xl text-slate-500 font-bold text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* STEP 2: Fill Details */}
              {step === 2 && (
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sender Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <Input 
                          name="senderName"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          required
                          placeholder="Name on bank transfer"
                          className="pl-10 h-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold focus:ring-slate-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction ID / Reference</label>
                      <div className="relative">
                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <Input 
                          name="transactionId"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          required
                          placeholder="Reference / Transaction Number"
                          className="pl-10 h-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold focus:ring-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 h-11 rounded-xl text-slate-500 font-bold text-xs uppercase"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!senderName.trim() || !transactionId.trim()}
                      className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Upload Receipt */}
              {step === 3 && (
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Screenshot / Receipt *</label>
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
                        "h-28 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 z-10",
                        fileName ? "bg-emerald-50 border-emerald-250" : "bg-slate-50 border-slate-200 group-hover:border-slate-350"
                      )}>
                        {fileName ? (
                          <>
                            <CheckCircle2 size={24} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tight truncate max-w-[180px]">{fileName}</span>
                          </>
                        ) : (
                          <>
                            <Camera size={24} className="text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attach Receipt Screenshot *</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] space-y-1.5 text-slate-650">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Target Account:</span>
                      <span className="font-black text-slate-950">{selectedBank ? selectedBank.bankName : ""}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Total Utility Owed:</span>
                      <span className="font-black text-slate-950">{bill.amount.toLocaleString()} {currency}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Transaction Reference:</span>
                      <span className="font-black text-slate-950 truncate max-w-[150px]">{transactionId}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1 h-11 rounded-xl text-slate-500 font-bold text-xs uppercase"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit"
                      disabled={loading || !fileName}
                      className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin text-white h-4 w-4" /> : "Submit Pay"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
