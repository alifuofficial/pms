"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Loader2, 
  CheckCircle2, 
  ChevronRight,
  User,
  Hash,
  Building2,
  Zap,
  Droplet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reportAllUtilitiesPayment } from "@/lib/actions/utilities";
import { toast } from "sonner";

interface PublicReportAllUtilitiesProps {
  bills: any[];
  currency: string;
  bankAccounts: any[];
}

export function PublicReportAllUtilities({ 
  bills, 
  currency, 
  bankAccounts = [] 
}: PublicReportAllUtilitiesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);

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
    formData.append("billIds", bills.map(b => b.id).join(","));
    formData.append("senderName", senderName);
    formData.append("transactionId", transactionId);
    if (selectedBankId) {
      formData.append("bankAccountId", selectedBankId);
    }
    formData.append("screenshot", screenshotFile);

    try {
      const result = await reportAllUtilitiesPayment(formData);
      if (result.success) {
        setSubmitted(true);
        toast.success("Combined utility payment receipt submitted for review.");
      } else {
        toast.error(result.error || "Failed to submit payment report.");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
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
          className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider px-4 rounded-xl shadow-md active:scale-95 transition-all"
        >
          Pay All Utilities
        </Button>
      } />
      <DialogContent className="sm:max-w-[450px] p-0 border-none bg-white rounded-3xl overflow-hidden shadow-2xl">
        {submitted ? (
          <div className="bg-emerald-50 p-10 text-center space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight">RECEIPTS SUBMITTED</h3>
              <p className="text-xs font-bold text-emerald-700/70 leading-relaxed uppercase tracking-widest">
                Our team will review your combined utility payment transaction reference shortly.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="rounded-xl border-emerald-200 text-emerald-700 font-black text-[10px] uppercase tracking-widest px-8"
            >
              Close
            </Button>
          </div>
        ) : (
          <div>
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em]">Step {step} of 3</p>
                <h3 className="text-base font-black tracking-tight uppercase">
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
              {step === 1 && (
                <div className="p-6 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 mb-2 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Combined Utilities Total</p>
                    <div className="flex justify-between items-center text-sm font-black text-slate-900">
                      <span>Total to Pay:</span>
                      <span>{totalAmount.toLocaleString()} {currency}</span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-semibold space-y-1 pt-2 border-t border-slate-200/50 max-h-[120px] overflow-y-auto">
                      {bills.map(b => (
                        <div key={b.id} className="flex justify-between">
                          <span className="uppercase text-slate-500">Unit {b.lease?.unit?.unitNumber || "N/A"} ({b.type === "ELECTRICITY" ? "Power" : "Water"}):</span>
                          <span>{b.amount.toLocaleString()} {currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select bank for transfer:</p>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
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

              {step === 3 && (
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirm Bank Transfer Details</p>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase">To Bank:</span>
                        <span className="font-extrabold text-slate-800">{bankAccounts.find(b => b.id === selectedBankId)?.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase">Amount:</span>
                        <span className="font-mono font-extrabold text-slate-800">{totalAmount.toLocaleString()} {currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase">Ref:</span>
                        <span className="font-mono font-extrabold text-slate-800">{transactionId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Receipt Screenshot</label>
                    <div className="border-2 border-dashed border-slate-150 rounded-2xl p-6 text-center hover:bg-slate-50/50 cursor-pointer transition-colors relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        required
                      />
                      <div className="space-y-1.5 pointer-events-none">
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                          {fileName || "Select Screenshot File"}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400">
                          {fileName ? "Click to change file" : "Upload PNG, JPG, or PDF proof"}
                        </p>
                      </div>
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
                      disabled={loading || !screenshotFile}
                      className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10"
                    >
                      {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        "Submit Proof"
                      )}
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
