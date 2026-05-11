"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  FileText, 
  ArrowUpRight,
  Loader2,
  ShieldCheck,
  ExternalLink,
  Download,
  User,
  Hash,
  DollarSign
} from "lucide-react";
import { approvePayment, rejectPayment, togglePenaltyPaid } from "@/lib/actions/payments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VerifyPaymentDialogProps {
  payment: any;
  currency: string;
}

export function VerifyPaymentDialog({ payment, currency }: VerifyPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isPDF = payment.receiptUrl?.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(payment.receiptUrl || "");

  const handleApprove = async () => {
    setIsLoading(true);
    const penaltyInput = document.getElementById("penalty-received-input") as HTMLInputElement;
    const penaltyReceived = penaltyInput ? parseFloat(penaltyInput.value) : undefined;
    
    const result = await approvePayment(payment.id, penaltyReceived);
    setIsLoading(false);
    if (result.success) {
      toast.success("Payment approved and verified.");
      setOpen(false);
    } else {
      toast.error(result.error || "Failed to approve payment.");
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    const result = await rejectPayment(payment.id);
    setIsLoading(false);
    if (result.success) {
      toast.success("Payment rejected.");
      setOpen(false);
    } else {
      toast.error(result.error || "Failed to reject payment.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          (payment.status === "APPROVED" ? (
            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-3">
              <CheckCircle2 size={12} className="mr-1.5" /> Verified
            </Button>
          ) : payment.status === "REJECTED" ? (
            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg px-3">
              <XCircle size={12} className="mr-1.5" /> Rejected
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3">
              Verify <ArrowUpRight size={12} className="ml-1.5" />
            </Button>
          )) as React.ReactElement
        } 
      />
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-0 border-none shadow-2xl custom-scrollbar">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                <ShieldCheck size={24} />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900">Verification</DialogTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Audit</p>
              </div>
            </div>
            {payment.receiptUrl && (
              <div className="flex items-center gap-2">
                <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200">
                    <ExternalLink size={16} />
                  </Button>
                </a>
                <a href={payment.receiptUrl} download>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200">
                    <Download size={16} />
                  </Button>
                </a>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Summary Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Tenant Name</p>
                <p className="text-sm font-bold text-slate-900">{payment.tenant.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Reference</p>
                <p className="text-[10px] font-bold text-blue-600">INV-{payment.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Reported Amount</p>
                <p className="text-xl font-black text-slate-900">{currency} {payment.amount.toLocaleString()}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source</p>
                <Badge variant="outline" className="text-[10px] font-black border-slate-200">Combined Payment</Badge>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                        <DollarSign size={14} />
                     </div>
                     <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Financial Allocation</p>
                   </div>
                   <p className="text-[9px] font-bold text-amber-600 uppercase">Verification Split</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Penalty Portion</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{currency}</span>
                        <input 
                          type="number"
                          id="penalty-received-input"
                          defaultValue={(() => {
                            if (payment.type === "PENALTY") return payment.amount;
                            const monthlyRent = payment.lease?.unit?.rentAmount || 0;
                            if (monthlyRent <= 0) return 0;
                            
                            // Calculate how many full months of rent this covers
                            const monthsCovered = Math.max(1, Math.floor(payment.amount / monthlyRent));
                            const rentPortion = monthlyRent * monthsCovered;
                            return Math.max(0, payment.amount - rentPortion);
                          })()}
                          className="w-full h-10 pl-10 pr-3 bg-white border-amber-100 rounded-xl font-mono text-xs font-black focus:ring-2 focus:ring-amber-500 transition-all"
                          placeholder="Fines..."
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Rent Allocation</label>
                      <div className="h-10 px-4 flex items-center bg-slate-100/50 border border-slate-100 rounded-xl">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Automatic</p>
                      </div>
                   </div>
                </div>
                <p className="text-[9px] text-amber-600 font-medium italic">
                  * Entering an amount here will automatically save it to the dedicated Penalty table.
                </p>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Status</p>
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border",
                  payment.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : payment.status === "REJECTED" ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100"
                )}>
                  {payment.status}
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 p-4 bg-white border border-slate-100 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Due Date</span>
              </div>
              <p className="text-xs font-bold text-slate-700">{new Date(payment.dueDate).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1.5 p-4 bg-white border border-slate-100 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <User size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Sender Name</span>
              </div>
              <p className="text-xs font-bold text-slate-700 truncate">{payment.senderName || "System Automated"}</p>
            </div>
            <div className="space-y-1.5 p-4 bg-white border border-slate-100 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <CreditCard size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Method</span>
              </div>
              <p className="text-xs font-bold text-slate-700">Bank Transfer</p>
            </div>
            <div className="space-y-1.5 p-4 bg-white border border-slate-100 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Transaction ID</span>
              </div>
              <p className="text-xs font-bold text-slate-700 truncate">{payment.transactionId || "N/A"}</p>
            </div>
          </div>

          {/* Automatic Receipt Preview */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Attached Receipt Preview</p>
            {payment.receiptUrl ? (
              <div className="w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner min-h-[300px] flex items-center justify-center">
                {isPDF ? (
                  <iframe 
                    src={`${payment.receiptUrl}#toolbar=0`} 
                    className="w-full h-[400px] border-none"
                    title="Receipt Preview"
                  />
                ) : isImage ? (
                  <img 
                    src={payment.receiptUrl} 
                    alt="Receipt" 
                    className="max-w-full h-auto object-contain" 
                  />
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <FileText size={48} className="text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">Preview not available for this file type.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-32 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                <XCircle size={24} />
                <p className="text-[10px] font-bold uppercase tracking-widest">No Receipt Attached</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 gap-3 sticky bottom-0 z-10">
          <Button 
            variant="outline" 
            disabled={isLoading}
            onClick={handleReject}
            className="flex-1 h-12 rounded-xl border-slate-200 text-red-600 font-bold hover:bg-red-50 hover:border-red-100 transition-all shadow-none"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Reject Payment"}
          </Button>
          <Button 
            disabled={isLoading || payment.status === "APPROVED"}
            onClick={handleApprove}
            className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-lg shadow-slate-900/20"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} /> Approve & Post
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
