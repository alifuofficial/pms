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
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Calendar, 
  FileText, 
  ArrowUpRight,
  Loader2,
  Upload,
  Receipt,
  Download,
  ExternalLink
} from "lucide-react";
import { submitPaymentReceipt } from "@/lib/actions/payments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TenantPaymentDialogProps {
  payment: any;
  currency: string;
}

export function TenantPaymentDialog({ payment, currency }: TenantPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(payment.receiptUrl || "");

  const handleSubmit = async () => {
    if (!receiptUrl) {
      toast.error("Please provide a receipt URL or upload a file first.");
      return;
    }

    setIsLoading(true);
    const result = await submitPaymentReceipt(payment.id, receiptUrl);
    setIsLoading(false);
    
    if (result.success) {
      toast.success("Receipt submitted for verification.");
      setOpen(false);
    } else {
      toast.error(result.error || "Failed to submit receipt.");
    }
  };

  const isPDF = payment.receiptUrl?.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(payment.receiptUrl || "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <Button variant="ghost" size="sm" className={cn(
            "h-8 text-[10px] font-black uppercase tracking-widest rounded-lg px-3",
            payment.status === "APPROVED" ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" :
            payment.status === "PENDING" ? "text-amber-600 bg-amber-50 hover:bg-amber-100" :
            "text-blue-600 bg-blue-50 hover:bg-blue-100"
          )}>
            Details <ArrowUpRight size={12} className="ml-1.5" />
          </Button>
        } 
      />
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl p-0 border-none shadow-2xl overflow-hidden">
        <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-2xl">
              <Receipt size={24} />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900">Payment Invoice</DialogTitle>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">INV-{payment.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
             <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Amount Due</p>
                <p className="text-xl font-black text-slate-900">{currency} {payment.amount.toLocaleString()}</p>
             </div>
             <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                <div className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border",
                  payment.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  payment.status === "PENDING" ? "bg-amber-50 text-amber-600 border-amber-100" :
                  "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  {payment.status}
                </div>
             </div>
          </div>

          <div className="space-y-3">
             <Link href={`/invoice/${payment.id}`} target="_blank">
               <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                 <FileText size={18} className="text-blue-600" /> View Official Invoice
               </Button>
             </Link>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-1">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Submission</p>
               {payment.receiptUrl && (
                 <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Already Uploaded</span>
               )}
            </div>

            {payment.status === "APPROVED" ? (
              <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-emerald-900">Payment Verified</p>
                <p className="text-[10px] text-emerald-600 font-medium">This transaction has been successfully approved by the accountant.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative group">
                  <Upload className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input 
                    type="text"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="Enter receipt URL (from bank transfer)..."
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[9px] text-slate-400 font-medium px-1">Please provide the URL of your payment receipt or bank transfer confirmation screen.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 sticky bottom-0">
          <Button 
            disabled={isLoading || payment.status === "APPROVED"}
            onClick={handleSubmit}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-lg shadow-slate-900/20"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Submit for Verification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
