import { prisma } from "@/lib/prisma";
import { getSystemSettings, getEffectiveCalendar } from "@/lib/actions/settings";
import { formatSystemDate } from "@/lib/calendar";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, AlertCircle, XCircle, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function InvoiceVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [settings, calendarType] = await Promise.all([
    getSystemSettings(),
    getEffectiveCalendar()
  ]);

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      tenant: true,
      lease: {
        include: {
          unit: {
            include: {
              property: true
            }
          }
        }
      }
    }
  });

  if (!payment) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Invoice Not Found</h1>
        <p className="text-slate-500 mt-2 text-center">The requested invoice could not be found or is invalid.</p>
      </div>
    );
  }

  // Determine Verification Status
  let statusInfo = {
    label: "Unknown",
    icon: AlertCircle,
    color: "bg-slate-50 text-slate-600 border-slate-200",
    message: "Status is unknown."
  };

  if (payment.status === "APPROVED") {
    statusInfo = {
      label: "PAID IN FULL",
      icon: ShieldCheck,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      message: "This invoice has been paid and verified by our accounting team."
    };
  } else if (payment.status === "REJECTED") {
    statusInfo = {
      label: "REJECTED",
      icon: XCircle,
      color: "bg-red-50 text-red-700 border-red-200",
      message: "This invoice or its payment receipt was rejected."
    };
  } else if (payment.status === "PENDING") {
    if (payment.receiptUrl) {
      statusInfo = {
        label: "UNDER REVIEW",
        icon: Clock,
        color: "bg-amber-50 text-amber-700 border-amber-200",
        message: "Payment receipt submitted. Waiting for accountant verification."
      };
    } else {
      statusInfo = {
        label: "PAY NOW",
        icon: AlertCircle,
        color: "bg-blue-50 text-blue-700 border-blue-200",
        message: "This invoice is currently unpaid."
      };
    }
  }

  const invoiceId = `INV-${payment.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-12 px-4 sm:px-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Building2 size={32} className="text-white" />
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight">{settings.organizationName || settings.systemName}</h1>
          <p className="text-sm text-slate-300 font-medium mt-1">Official Invoice Verification</p>
        </div>

        {/* Status Area */}
        <div className={`p-8 border-b border-slate-100 flex flex-col items-center text-center ${statusInfo.color.split(' ')[0]}`}>
          <statusInfo.icon className={`w-16 h-16 mb-4 ${statusInfo.color.split(' ')[1]}`} />
          <h2 className={`text-2xl font-black uppercase tracking-widest ${statusInfo.color.split(' ')[1]}`}>
            {statusInfo.label}
          </h2>
          <p className="mt-2 text-sm font-medium opacity-80 max-w-xs">{statusInfo.message}</p>
        </div>

        {/* Details Grid */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice ID</span>
            <span className="text-sm font-bold text-slate-900">{invoiceId}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billed To</span>
            <span className="text-sm font-bold text-slate-900">{payment.tenant.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit / Property</span>
            <span className="text-sm font-bold text-slate-900">
              {payment.lease?.unit?.unitNumber} - {payment.lease?.unit?.property?.name}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Due</span>
            <span className="text-lg font-black text-slate-900">{settings.currency} {payment.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issue Date</span>
            <span className="text-sm font-bold text-slate-900">{formatSystemDate(new Date(payment.createdAt), calendarType)}</span>
          </div>
        </div>

        {/* Action Footer */}
        {statusInfo.label === "PAY NOW" && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
            <Link href="/auth/login" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-sm shadow-md">
                Log In To Pay Online
              </Button>
            </Link>
          </div>
        )}
      </div>

      <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
        <ShieldCheck size={12} /> Verified by {settings.systemName}
      </p>
    </div>
  );
}
