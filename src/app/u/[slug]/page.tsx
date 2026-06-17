import { getPublicUnitStatus } from "@/lib/actions/qr";
import { PublicReportPayment } from "@/components/shared/public-report-payment";
import { PublicReportUtilityPayment } from "@/components/shared/public-report-utility-payment";
import { prisma } from "@/lib/prisma";
import { 
  Building2, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  CreditCard,
  Banknote,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Loader2,
  Wrench,
  Hourglass,
  Zap,
  Droplet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatSystemDate, formatEthiopianMonthYear } from "@/lib/calendar";
import { differenceInDays, format } from "date-fns";
import Link from "next/link";
import Kenat from "kenat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicUnitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // ── Maintenance mode check (runs before any unit lookup) ────
  const sysSettings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
  if (sysSettings?.maintenanceMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Animated background rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5 animate-ping" style={{ animationDuration: "4s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/5 animate-ping" style={{ animationDuration: "3s", animationDelay: "1s" }} />
        </div>

        <div className="relative max-w-sm w-full space-y-8">
          {/* Logo / Branding */}
          <div className="flex items-center justify-center gap-3">
            {sysSettings.logoUrl ? (
              <img src={sysSettings.logoUrl} alt="Logo" className="h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Building2 size={20} className="text-white/60" />
              </div>
            )}
            <span className="text-white font-black text-lg tracking-tight">
              {sysSettings.systemName || "Soreti PMS"}
            </span>
          </div>

          {/* Icon */}
          <div className="mx-auto w-24 h-24 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center">
            <Wrench size={40} className="text-amber-400" />
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-white tracking-tight">Under Maintenance</h1>
            <p className="text-sm font-medium text-slate-400 leading-relaxed">
              {sysSettings.maintenanceMessage || "We are currently performing scheduled maintenance. Please check back shortly."}
            </p>
          </div>

          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Service Temporarily Unavailable</span>
          </div>

          {/* Footer */}
          <p className="text-[11px] text-slate-600 font-medium">
            Powered by {sysSettings.systemName || "Soreti PMS"}
          </p>
        </div>
      </div>
    );
  }

  const result = await getPublicUnitStatus(slug);

  if (!result.success || !result.unit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-20 h-20 bg-slate-200 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Gateway Error</h1>
          <p className="text-sm font-medium text-slate-500">The scanned unit signature is invalid or has been decommissioned by the property manager.</p>
          <div className="pt-4">
            <Link href="/">
              <Button variant="outline" className="rounded-xl border-slate-200 font-bold text-xs uppercase tracking-widest px-8">Return to Portal</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { unit, lease, settings } = result;
  
  // Calculate Status
  let status = "AVAILABLE"; 
  let statusColor = "text-slate-500 bg-slate-50 border-slate-100";
  let themeColor = "bg-slate-900";
  let accentColor = "text-slate-900";
  let statusIcon = <HelpCircle size={14} />;
  let statusLabel = "VACANT";
  let daysLeft: number | null = null;

  if (unit.status === "COMPANY_OWNED") {
    status = "COMPANY_OWNED";
    statusColor = "text-indigo-600 bg-indigo-50 border-indigo-100";
    themeColor = "bg-indigo-900"; 
    accentColor = "text-indigo-600";
    statusIcon = <Building2 size={14} />;
    statusLabel = "COMPANY OWNED";
  } else if (unit.status === "OCCUPIED" || lease) {
    statusLabel = "OCCUPIED";
    statusColor = "text-blue-600 bg-blue-50 border-blue-100";
    themeColor = "bg-slate-900"; 
    accentColor = "text-slate-900";

    const nextPayment = lease?.nextDuePayment;
    const now = new Date();
    // Use the Ethiopian month-end date for status decisions, or fall back to stored dueDate
    const ethiopianDue = nextPayment?.ethiopianDueDate 
      ? new Date(nextPayment.ethiopianDueDate) 
      : nextPayment ? new Date(nextPayment.dueDate) : null;
    // Days remaining of prepaid coverage
    const daysLeftVal = lease ? lease.daysLeft : 0;
    daysLeft = daysLeftVal;
    
    if (nextPayment && nextPayment.receiptUrl) {
        // Payment submitted, waiting for accountant review
        status = "PENDING";
        statusColor = "text-blue-600 bg-blue-50 border-blue-100";
        themeColor = "bg-slate-900";
        accentColor = "text-slate-900";
        statusIcon = <Loader2 size={14} className="animate-spin" />;
        statusLabel = "UNDER REVIEW";
    } else if (lease && lease.arrearsCount > 0) {
        // Rent arrears exist
        status = "OVERDUE";
        statusColor = "text-rose-600 bg-rose-50 border-rose-100";
        themeColor = "bg-rose-600";
        accentColor = "text-rose-600";
        statusIcon = <AlertCircle size={14} />;
        statusLabel = "OVERDUE";
    } else if (daysLeftVal < 0) {
        // Prepaid expired / overdue
        status = "OVERDUE";
        statusColor = "text-rose-600 bg-rose-50 border-rose-100";
        themeColor = "bg-rose-600";
        accentColor = "text-rose-600";
        statusIcon = <AlertCircle size={14} />;
        statusLabel = "OVERDUE";
    } else if (daysLeftVal <= 5) {
        // 5 days or less remaining in coverage (yellow)
        status = "DUE";
        statusColor = "text-amber-600 bg-amber-50 border-amber-100";
        themeColor = "bg-amber-500";
        accentColor = "text-amber-500";
        statusIcon = <Clock size={14} />;
        statusLabel = "PAY NOW";
    } else {
        // Standard paid active coverage (green)
        status = "PAID";
        statusColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
        themeColor = "bg-emerald-600";
        accentColor = "text-emerald-600";
        statusIcon = <CheckCircle2 size={14} />;
        statusLabel = "PAID";
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      {/* Top Identity Section */}
      <div className={cn(themeColor, "text-white pt-12 pb-24 px-6 relative overflow-hidden transition-colors duration-700")}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="max-w-md mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-xl">
               <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none mb-1">{unit.property}</h1>
              <div className="flex items-center gap-1.5 opacity-70">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {lease ? lease.tenantName : "Unit Status Node"}
                </p>
              </div>
            </div>
          </div>
          
          <div className={cn(
            "px-4 py-2 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all duration-500 bg-white",
            statusColor,
            "border-transparent"
          )}>
            <div className="flex items-center gap-2">
               {statusIcon}
               {statusLabel}
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto mt-8 flex items-center gap-2 opacity-20">
           <div className="h-px bg-white flex-1" />
           <p className="text-[8px] font-black uppercase tracking-[0.4em]">AES-256 Encrypted Session</p>
           <div className="h-px bg-white flex-1" />
        </div>
      </div>

      {/* Main Status Engine */}
      <div className="max-w-md mx-auto px-6 -mt-16 space-y-6 pb-20 relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/5 overflow-hidden border border-slate-100 flex flex-col">
          {/* Unit Hero */}
          <div className="p-10 text-center border-b border-slate-50 relative group">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                 <ShieldCheck size={10} className="text-blue-500" />
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Verified Identity</p>
              </div>
              <h2 className={cn("text-6xl font-black tracking-tighter leading-none font-mono transition-colors duration-500", accentColor)}>
                {unit.unitNumber}
              </h2>
              <div className="flex items-center justify-center gap-3 pt-2">
                 <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{unit.type}</span>
                 <span className="w-1 h-1 bg-slate-300 rounded-full" />
                 <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase text-slate-500 tracking-widest font-mono">{unit.size} M²</span>
              </div>
            </div>
          </div>

          {/* Status Metrics */}
          <div className="p-8 space-y-8 bg-white">
            {lease ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                   <div className={cn(
                     "p-5 rounded-[2rem] border space-y-2",
                     lease.grandTotal > 0 ? "bg-rose-50 border-rose-100" : "bg-slate-50/50 border-slate-100/80"
                   )}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {lease.arrearsCount > 0 ? "Total Arrears" : "Current Balance"}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black text-slate-400">{settings.currency}</span>
                        <p className={cn(
                          "text-2xl font-black tracking-tighter transition-colors duration-500",
                          lease.grandTotal > 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {(lease.grandTotal > 0 ? lease.grandTotal : 0).toLocaleString()}
                        </p>
                      </div>
                      {lease.arrearsCount > 0 && (
                         <p className={cn(
                           "text-[9px] font-black uppercase tracking-wider",
                           lease.arrearsMonths.every((m: any) => m.status === "PENDING") 
                            ? "text-amber-500 animate-pulse" 
                            : "text-rose-500"
                         )}>
                           {lease.arrearsMonths.every((m: any) => m.status === "PENDING") 
                             ? "Verification In Progress" 
                             : `${lease.arrearsCount} months overdue`}
                         </p>
                       )}
                      {lease.grandTotal === 0 && (
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">All Rent Settled</p>
                      )}
                   </div>
                   <div className={cn(
                      "p-5 rounded-[2rem] border space-y-2 transition-colors duration-500",
                      lease.daysLeft > 5 ? "bg-emerald-50/50 border-emerald-100" :
                      lease.daysLeft >= 0 ? "bg-amber-50 border-amber-100" :
                      "bg-rose-50 border-rose-100"
                    )}>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Countdown</p>
                       <div className="flex items-baseline gap-1">
                         <p className={cn(
                           "text-2xl font-black tracking-tighter transition-colors duration-500",
                           lease.daysLeft > 5 ? "text-emerald-600" :
                           lease.daysLeft >= 0 ? "text-amber-600" :
                           "text-rose-600"
                         )}>
                           {Math.abs(lease.daysLeft)}
                         </p>
                         <span className="text-[10px] font-black text-slate-400 uppercase">
                           {lease.daysLeft < 0 ? "Days Past" : "Days Left"}
                         </span>
                       </div>
                       {lease.daysLeft < 0 && (
                         <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider animate-pulse">Prepaid Expired</p>
                       )}
                       {lease.daysLeft === 0 && (
                         <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Expires Today</p>
                       )}
                       {lease.daysLeft > 0 && lease.daysLeft <= 5 && (
                         <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider animate-pulse">Expires Soon</p>
                       )}
                       {lease.daysLeft > 5 && (
                         <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Plan Active</p>
                       )}
                    </div>
                </div>

                {status === "DUE" && statusLabel === "GRACE PERIOD" && (
                   <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 space-y-2">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-200 rounded-xl text-amber-900">
                           <Clock size={20} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Grace Period Active</p>
                           <p className="text-sm font-black text-amber-900">Pay before Day 5 to avoid penalty</p>
                        </div>
                     </div>
                   </div>
                )}

                {typeof lease.nextDuePayment?.penalty === "number" && lease.nextDuePayment.penalty > 0 && (
                  <div className={cn(
                    "p-5 rounded-3xl border animate-pulse",
                    lease.nextDuePayment.penaltyTier === 2 ? "bg-rose-600 text-white border-rose-700" : "bg-amber-50 text-amber-900 border-amber-200"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl",
                        lease.nextDuePayment.penaltyTier === 2 ? "bg-white/20" : "bg-amber-200"
                      )}>
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                          {lease.nextDuePayment.penaltyTier === 2 ? "Final Warning" : "Late Fee Applied"}
                        </p>
                        <p className="text-sm font-black tracking-tight">
                          Penalty: {settings.currency} {lease.nextDuePayment.penalty.toLocaleString()} ({lease.nextDuePayment.penaltyTier === 2 ? "10%" : "5%"})
                        </p>
                      </div>
                    </div>
                    {lease.nextDuePayment.penaltyTier === 2 && (
                      <p className="text-[10px] font-bold mt-2 pt-2 border-t border-white/20 uppercase tracking-tighter leading-tight">
                        Account flag: Legal action or eviction proceedings may be initiated if payment is not received immediately.
                      </p>
                    )}
                  </div>
                )}

                {/* ── MULTI-MONTH ARREARS BREAKDOWN ── */}
                {lease.arrearsMonths && lease.arrearsMonths.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={10} className="text-rose-500" />
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Overdue Breakdown</p>
                      </div>
                      <p className="text-[9px] font-black text-rose-400 uppercase">{lease.arrearsMonths.length} Month{lease.arrearsMonths.length > 1 ? 's' : ''}</p>
                    </div>
                    <div className="bg-rose-50/50 rounded-[2rem] border border-rose-100 overflow-hidden divide-y divide-rose-100">
                      {(lease.arrearsMonths as any[]).map((m, i) => (
                        <div key={m.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-black text-rose-900 uppercase tracking-tight flex items-center gap-1.5">
                              {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />}
                              {format(new Date(m.dueDate), "MMMM yyyy")}
                            </p>
                            <p className="text-[9px] font-bold text-rose-500 uppercase">
                              {formatEthiopianMonthYear(new Date(
                                new Date(m.dueDate).getFullYear(),
                                new Date(m.dueDate).getMonth(),
                                15
                              ))}
                            </p>
                            {m.penalty > 0 && (
                              <p className="text-[9px] font-bold text-amber-600 uppercase mt-0.5">
                                + {settings.currency} {m.penalty.toLocaleString()} penalty ({m.penaltyTier === 2 ? '10%' : '5%'})
                              </p>
                            )}
                            {m.advanceDeduction > 0 && (
                              <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">
                                - {settings.currency} {m.advanceDeduction.toLocaleString()} advance applied
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-rose-700">
                              {settings.currency} {m.totalAmount.toLocaleString()}
                            </p>
                            {m.receiptUrl && (
                              <p className="text-[9px] font-bold text-blue-500 uppercase">Under Review</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Historical penalty records from Penalty table */}
                      {lease.unpaidPenalties && (lease.unpaidPenalties as any[]).length > 0 && 
                        (lease.unpaidPenalties as any[]).map((p) => (
                          <div key={p.id} className="p-4 flex items-center justify-between bg-amber-50/30">
                            <div>
                              <p className="text-[11px] font-black text-amber-900 uppercase tracking-tight">Historical Penalty</p>
                              <p className="text-[9px] font-bold text-amber-600 uppercase">{formatEthiopianMonthYear(new Date(new Date(p.dueDate).getFullYear(), new Date(p.dueDate).getMonth(), 15))}</p>
                            </div>
                            <p className="text-xs font-black text-amber-700">{settings.currency} {p.amount.toLocaleString()}</p>
                          </div>
                        ))
                      }
                      {/* Grand Total row */}
                      {lease.arrearsMonths.length > 1 && (
                        <div className="p-4 flex items-center justify-between bg-rose-100/50">
                          <p className="text-[11px] font-black text-rose-900 uppercase tracking-widest">Grand Total</p>
                          <p className="text-sm font-black text-rose-700">{settings.currency} {(lease.grandTotal || 0).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Historical penalty-only records when no pending payments */}
                {(!lease.arrearsMonths || lease.arrearsMonths.length === 0) && 
                  lease.nextDuePayment?.historicalPenalties && 
                  lease.nextDuePayment.historicalPenalties.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                       <AlertCircle size={10} className="text-rose-500" />
                       <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Arrears Breakdown</p>
                    </div>
                    <div className="bg-rose-50/50 rounded-[2rem] border border-rose-100 overflow-hidden divide-y divide-rose-100">
                      {(lease.nextDuePayment.historicalPenalties as any[]).map((p) => (
                        <div key={p.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-black text-rose-900 uppercase tracking-tight">
                              Late Fee: {format(new Date(p.dueDate), "MMMM yyyy")}
                            </p>
                            <p className="text-[9px] font-bold text-rose-500 uppercase">
                              {formatEthiopianMonthYear(new Date(new Date(p.dueDate).getFullYear(), new Date(p.dueDate).getMonth(), 15))}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-rose-700">
                              {settings.currency} {p.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Covered</p>
                      {lease.latestApprovedPayment ? (
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-slate-900">{format(new Date(lease.latestApprovedPayment.dueDate), "MMMM yyyy")}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase">
                              {formatEthiopianMonthYear(new Date(lease.latestApprovedPayment.dueDate))}
                            </p>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-400 uppercase">No approved payments found</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {lease.arrearsCount > 0 ? "Oldest Overdue" : "Next Month"}
                      </p>
                      {lease.nextDuePayment ? (
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-slate-900">{format(new Date(lease.nextDuePayment.dueDate), "MMMM yyyy")}</p>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase">
                            {formatEthiopianMonthYear(new Date(lease.nextDuePayment.dueDate))}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-400">N/A</p>
                      )}
                    </div>
                  </div>
                    
                    <div className="h-px bg-slate-200/50" />
                    
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Payment Due</p>
                      {lease.nextDuePayment ? (
                        <div className="space-y-0.5">
                          {/* Show Ethiopian month-end date as the actual deadline */}
                          <p className="text-sm font-black text-slate-900">
                            {lease.nextDuePayment.ethiopianDueDate 
                              ? format(new Date(lease.nextDuePayment.ethiopianDueDate), "MMMM d, yyyy")
                              : format(new Date(lease.nextDuePayment.dueDate), "MMMM d, yyyy")}
                          </p>
                          <p className="text-[10px] font-bold text-amber-600 uppercase">
                             {formatSystemDate(
                               lease.nextDuePayment.ethiopianDueDate 
                                 ? new Date(lease.nextDuePayment.ethiopianDueDate)
                                 : new Date(lease.nextDuePayment.dueDate), 
                               "ETHIOPIAN"
                             )}
                          </p>
                          {lease.nextDuePayment.status === "ESTIMATED" && (
                            <div className="pt-2 space-y-1">
                               <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                                  Thank you for this month payment. Get ready for next month!
                               </p>
                               <p className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-tighter">
                                  ለዚህ ወር ክፍያ እናመሰግናለን። ለሚቀጥለው ወር ይዘጋጁ!
                               </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-400 uppercase">Next cycle pending</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
             ) : unit.status === "COMPANY_OWNED" ? (
              <div className="p-12 text-center space-y-4 bg-indigo-50/50 rounded-[2.5rem] border border-dashed border-indigo-200">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-indigo-500 shadow-sm">
                   <Building2 size={32} />
                 </div>
                 <div className="space-y-1">
                    <p className="text-sm font-black text-indigo-900 uppercase tracking-tighter">Unit Status: Company Owned</p>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Reserved for Corporate Operations</p>
                 </div>
              </div>
            ) : (
              <div className="p-12 text-center space-y-4 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-300 shadow-sm">
                   <Building2 size={32} />
                 </div>
                 <div className="space-y-1">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Unit Status: Vacant</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Contact Manager to Rent</p>
                 </div>
              </div>
            )}
          </div>

          {/* Action Hub — blocked when any payment is under review */}
          {lease && (() => {
            const hasPendingReview = (lease.arrearsMonths as any[]).some(
              (m: any) => m.status === "PENDING"
            );

            if (hasPendingReview) {
              // Find the first pending entry to show its month label
              const pendingEntry = (lease.arrearsMonths as any[]).find(
                (m: any) => m.status === "PENDING"
              );
              const pendingMonthLabel = pendingEntry
                ? format(new Date(pendingEntry.dueDate), "MMMM yyyy")
                : "your payment";

              return (
                <div className="p-10 pt-0 mt-auto">
                  <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-8 space-y-5 text-center">
                    {/* Icon */}
                    <div className="mx-auto w-16 h-16 bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-center">
                      <Hourglass size={28} className="text-amber-500" />
                    </div>

                    {/* Status pill */}
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Payment Under Review</span>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <p className="text-sm font-black text-amber-900 leading-snug">
                        Your evidence for <span className="underline underline-offset-2">{pendingMonthLabel}</span> has been submitted.
                      </p>
                      <p className="text-xs font-semibold text-amber-600/80 leading-relaxed">
                        Our team is reviewing your payment. You will be notified once it is approved or if any action is required.
                      </p>
                    </div>

                    {/* Amharic translation */}
                    <p className="text-[10px] font-bold text-amber-500/70 leading-relaxed">
                      የክፍያ ማስረጃዎ ተቀብለናል። ቡድናችን በመገምገም ላይ ነው — ከጥቂት ጊዜ በኋላ ይፀድቃል።
                    </p>

                    {/* Divider */}
                    <div className="h-px bg-amber-200" />

                    {/* Footnote */}
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                      Contact your property manager if you need assistance.
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div className="p-10 pt-0 mt-auto">
                <PublicReportPayment
                  unitId={unit.id}
                  unitNumber={unit.unitNumber}
                  status={lease.latestApprovedPayment ? "PAID" : "UNPAID"}
                  nextMonth={lease.nextDuePayment ? format(new Date(lease.nextDuePayment.dueDate), "MMMM yyyy") : undefined}
                  nextMonthAmharic={lease.nextDuePayment ? formatEthiopianMonthYear(new Date(lease.nextDuePayment.dueDate)) : undefined}
                  rentAmount={unit.rentAmount}
                  currentPenalty={lease.nextDuePayment?.penalty || 0}
                  historicalPenalty={lease.nextDuePayment?.unpaidPenaltyTotal || 0}
                  currency={settings.currency}
                  grandTotal={lease.grandTotal || 0}
                  arrearsCount={lease.arrearsCount || 0}
                  bankAccounts={settings.bankAccounts || []}
                />
              </div>
            );
          })()}
        </div>

        {/* Utility Bills Card */}
        {lease && lease.utilityBills && lease.utilityBills.length > 0 && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/5 overflow-hidden border border-slate-100 p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-yellow-500" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Utility Payments</h3>
              </div>
              <Badge className="bg-slate-100 text-slate-600 border border-slate-150 shadow-none font-bold text-[9px] uppercase tracking-wider">
                {lease.utilityBills.filter((b: any) => b.status !== 'PAID').length} Unpaid
              </Badge>
            </div>

            <div className="space-y-4">
              {lease.utilityBills.map((bill: any) => {
                const isPaid = bill.status === "PAID";
                const isPending = bill.status === "PENDING";
                const isRejected = bill.status === "REJECTED";

                return (
                  <div key={bill.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/80">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shadow-sm",
                        bill.type === "ELECTRICITY" ? "bg-yellow-50 text-yellow-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {bill.type === "ELECTRICITY" ? <Zap size={16} /> : <Droplet size={16} />}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-900 uppercase">
                          {bill.type === "ELECTRICITY" ? "Electricity" : "Water"} - {bill.billingMonth}
                        </p>
                        {bill.previousReading !== null && bill.currentReading !== null ? (
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            Usage: {bill.usage.toLocaleString()} {bill.type === "ELECTRICITY" ? "kWh" : "m³"} ({bill.previousReading} → {bill.currentReading})
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Flat consumption charge</p>
                        )}
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          Due: {formatSystemDate(new Date(bill.dueDate), "ETHIOPIAN")}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="font-mono text-xs font-black text-slate-900">
                        {bill.amount.toLocaleString()} {settings.currency}
                      </span>
                      {isPaid ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-150 shadow-none font-bold text-[8px] uppercase py-0.5">
                          Paid
                        </Badge>
                      ) : isPending ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-150 shadow-none font-bold text-[8px] uppercase py-0.5 animate-pulse">
                          Reviewing
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {isRejected && (
                            <Badge className="bg-red-50 text-red-700 border-red-150 shadow-none font-bold text-[8px] uppercase py-0.5 mr-1">
                              Rejected
                            </Badge>
                          )}
                          <PublicReportUtilityPayment
                            bill={bill}
                            currency={settings.currency}
                            bankAccounts={settings.bankAccounts}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Security Meta */}
        <div className="flex flex-col items-center justify-center gap-4 pt-4">
           <div className="flex items-center gap-2 px-6 py-2 bg-slate-900/5 rounded-full border border-slate-200/50">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">End-to-End Verified Node</span>
           </div>
           
           <div className="text-center opacity-30 text-[9px] font-black uppercase tracking-[0.3em] space-y-2 pb-10">
              <p>Soreti Property Rental Operations</p>
              <div className="flex items-center justify-center gap-2">
                 <span>{slug}</span>
                 <span className="w-1 h-1 bg-slate-400 rounded-full" />
                 <span>v1.2.0-SECURE</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
