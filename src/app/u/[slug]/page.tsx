import { getPublicUnitStatus } from "@/lib/actions/qr";
import { 
  Building2, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  CreditCard,
  Banknote,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import Link from "next/link";

export default async function PublicUnitPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
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
  let statusIcon = <HelpCircle size={14} />;
  let statusLabel = "UNOCCUPIED";
  let daysLeft: number | null = null;

  if (lease) {
    const latestPayment = lease.latestPayment;
    const now = new Date();
    const dueDate = latestPayment ? new Date(latestPayment.dueDate) : null;
    
    if (latestPayment && latestPayment.status === "APPROVED") {
        status = "PAID";
        statusColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
        statusIcon = <CheckCircle2 size={14} />;
        statusLabel = "RENT PAID";
    } else if (dueDate && now > dueDate) {
        status = "OVERDUE";
        statusColor = "text-rose-600 bg-rose-50 border-rose-100";
        statusIcon = <AlertCircle size={14} />;
        statusLabel = "OVERDUE";
    } else {
        status = "DUE";
        statusColor = "text-amber-600 bg-amber-50 border-amber-100";
        statusIcon = <Clock size={14} />;
        statusLabel = "PAY NOW";
    }

    if (dueDate) {
        daysLeft = differenceInDays(dueDate, now);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      {/* Top Identity Section */}
      <div className="bg-slate-900 text-white pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="max-w-md mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-xl">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none mb-1">{unit.property}</h1>
              <div className="flex items-center gap-1.5 opacity-50">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Live Status Node</p>
              </div>
            </div>
          </div>
          
          <div className={cn(
            "px-3 py-1.5 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest shadow-lg",
            statusColor,
            "border-current opacity-90"
          )}>
            {statusLabel}
          </div>
        </div>
      </div>

      {/* Main Status Engine */}
      <div className="max-w-md mx-auto px-6 -mt-16 space-y-6 pb-20 relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/5 overflow-hidden border border-slate-100 flex flex-col">
          {/* Unit Hero */}
          <div className="p-10 text-center border-b border-slate-50 relative group">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Unit Identity</p>
              <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{unit.unitNumber}</h2>
              <div className="flex items-center justify-center gap-3 pt-2">
                 <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase text-slate-500 tracking-widest">{unit.type}</span>
                 <span className="w-1 h-1 bg-slate-300 rounded-full" />
                 <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase text-slate-500 tracking-widest">{unit.size} m²</span>
              </div>
            </div>
          </div>

          {/* Status Metrics */}
          <div className="p-8 space-y-8 bg-white">
            {lease ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100/80 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Rent</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black text-slate-400">{settings.currency}</span>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{unit.rentAmount.toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100/80 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Cycle</p>
                      {daysLeft !== null ? (
                        <div className="flex items-baseline gap-1">
                          <p className={cn(
                            "text-2xl font-black tracking-tighter",
                            daysLeft < 0 ? "text-rose-600" : "text-slate-900"
                          )}>{daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}</p>
                          <span className="text-[10px] font-black text-slate-400 uppercase">{daysLeft < 0 ? "Days Past" : "Days To Go"}</span>
                        </div>
                      ) : (
                        <p className="text-sm font-black text-slate-900">First Payment</p>
                      )}
                   </div>
                </div>

                {/* Bank Engine */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                       <Banknote size={14} className="text-slate-400" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bank Instructions</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {settings.bankAccounts.map((account) => (
                      <div key={account.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
                              <p className="text-xs font-black">{account.bankName.slice(0, 2).toUpperCase()}</p>
                           </div>
                           <div>
                              <p className="text-[11px] font-black text-slate-900 leading-none mb-1.5">{account.bankName}</p>
                              <p className="text-xs font-bold text-slate-500 tabular-nums">{account.accountNumber}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{account.accountName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center space-y-4 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-300 shadow-sm">
                   <HelpCircle size={32} />
                 </div>
                 <div className="space-y-1">
                    <p className="text-sm font-black text-slate-900 uppercase">Unit Status: Vacant</p>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">This unit currently has no active digital lease agreement.</p>
                 </div>
              </div>
            )}
          </div>

          {/* Action Hub */}
          <div className="p-10 pt-0 mt-auto">
             <div className="bg-slate-900 rounded-[2rem] p-1 overflow-hidden shadow-2xl shadow-slate-900/20 group cursor-pointer active:scale-95 transition-transform">
                <div className="bg-white/5 p-5 flex items-center justify-between rounded-[1.8rem]">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                         <CreditCard size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white tracking-tight uppercase">Quick Action</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Payment</p>
                      </div>
                   </div>
                   <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />
                </div>
             </div>
          </div>
        </div>

        {/* Auditor Footer */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-900/5 text-center space-y-4">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mx-auto text-slate-400">
             <AlertCircle size={18} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">For security reasons, detailed payment history is restricted. Please contact the <strong>Official Accountant</strong> for comprehensive ledger statements.</p>
          </div>
          <div className="pt-2">
            <div className="inline-block px-6 py-2 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Secured Node: {slug}
            </div>
          </div>
        </div>

        <div className="text-center opacity-20 text-[9px] font-black uppercase tracking-[0.3em] pt-8 space-y-2">
           <p>Soreti Property Rental Operations</p>
           <p className="text-[7px]">Unit Pulse Gateway v1.0.4</p>
        </div>
      </div>
    </div>
  );
}
