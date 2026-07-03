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
  Calendar, 
  FileText, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight
} from "lucide-react";
import { verifyUtilityPayment } from "@/lib/actions/utilities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VerifyUtilityPaymentDialogProps {
  bill: any;
  currency: string;
}

export function VerifyUtilityPaymentDialog({ bill, currency }: VerifyUtilityPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isPDF = bill.receiptUrl?.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(bill.receiptUrl || "");

  const handleVerify = async (status: "APPROVED" | "REJECTED") => {
    setIsLoading(true);
    const result = await verifyUtilityPayment(bill.id, status);
    setIsLoading(false);
    if (result.success) {
      toast.success(status === "APPROVED" ? "Utility payment approved and verified." : "Utility payment rejected.");
      setOpen(false);
    } else {
      toast.error(result.error || "Failed to verify utility payment.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        (bill.status === "APPROVED" || bill.status === "PAID" ? (
          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-3">
            <CheckCircle2 size={12} className="mr-1.5" /> Verified
          </Button>
        ) : bill.status === "REJECTED" ? (
          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg px-3">
            <XCircle size={12} className="mr-1.5" /> Rejected
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3">
            Verify <ArrowUpRight size={12} className="ml-1.5" />
          </Button>
        )) as React.ReactElement
      } />
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-white rounded-2xl p-0 border-none shadow-2xl">
        <div>
          <DialogHeader className="p-5 pb-3 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">Utility Receipt Audit</DialogTitle>
            <p className="text-xs text-slate-500">Verify payment reference and bank receipt accuracy.</p>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Bill Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Resident / Unit:</span>
                <span className="font-bold text-slate-800">{bill.tenant?.name} (Unit {bill.lease?.unit?.unitNumber || "N/A"})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Type:</span>
                <span className="font-bold text-slate-800 uppercase">{bill.type} ({bill.billingMonth})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Amount:</span>
                <span className="font-black text-slate-900 text-sm">{bill.amount.toLocaleString()} {currency}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Transaction ID</span>
                <span className="font-mono font-bold text-slate-800 truncate block">{bill.transactionId || "N/A"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Sender Name</span>
                <span className="font-bold text-slate-800 truncate block">{bill.senderName || "N/A"}</span>
              </div>
              <div className="space-y-0.5 mt-2 col-span-2 border-t border-slate-100 pt-2">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Payment Type</span>
                <span className="font-semibold text-slate-700 block">Bank Transfer</span>
              </div>
            </div>

            {/* Receipt Preview */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Transfer Receipt Screenshot</span>
              {bill.receiptUrl ? (
                <div className="w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center min-h-[200px]">
                  {isPDF ? (
                    <iframe 
                      src={`${bill.receiptUrl}#toolbar=0`} 
                      className="w-full h-[250px] border-none"
                      title="Receipt PDF"
                    />
                  ) : isImage ? (
                    <img 
                      src={bill.receiptUrl} 
                      alt="Receipt Screenshot" 
                      className="max-w-full h-auto object-contain max-h-[300px] p-2" 
                    />
                  ) : (
                    <div className="p-8 text-center space-y-2 text-slate-400">
                      <FileText size={32} className="mx-auto" />
                      <p className="text-xs">File preview not supported. Click link to download.</p>
                      <a href={bill.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline font-bold mt-1 block">
                        Open in new tab
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <AlertCircle size={20} className="mb-1 text-slate-350" />
                  No receipt screenshot has been uploaded.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => handleVerify("REJECTED")}
              className="h-11 rounded-xl border-slate-200 text-red-600 font-bold hover:bg-red-50 hover:border-red-100"
            >
              Reject
            </Button>
            <Button
              type="button"
              disabled={isLoading || bill.status === "APPROVED" || bill.status === "PAID"}
              onClick={() => handleVerify("APPROVED")}
              className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Approve & Settle"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
