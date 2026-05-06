import { prisma } from "@/lib/prisma";
import { 
  FileText, 
  CreditCard, 
  Search, 
  User, 
  Download, 
  ExternalLink, 
  FolderOpen,
  Filter,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatSystemDate } from "@/lib/calendar";
import { getSystemSettings } from "@/lib/actions/settings";
import { FilePreview } from "@/components/shared/file-preview";
import { Eye } from "lucide-react";

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const settings = await getSystemSettings();
  const params = await searchParams;
  const q = params?.q || "";
  
  // Fetch all tenants who have either a lease agreement or a payment receipt

  const tenantsWithFiles = await prisma.user.findMany({
    where: {
      role: "TENANT",
      name: { contains: q },
      OR: [
        { leases: { some: { leaseAgreementUrl: { not: null } } } },
        { payments: { some: { receiptUrl: { not: null } } } }
      ]
    },
    include: {
      leases: {
        where: { leaseAgreementUrl: { not: null } },
        include: { unit: { include: { property: true } } },
        orderBy: { createdAt: "desc" }
      },
      payments: {
        where: { receiptUrl: { not: null } },
        include: { lease: { include: { unit: { include: { property: true } } } } },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { name: "asc" }
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <FolderOpen size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Document Center</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Digital Archive</h1>
          <p className="text-sm text-slate-500 font-medium">Browse lease agreements and financial documents across all tenants.</p>
        </div>
        <div className="flex items-center gap-3">
          <form action="/admin/files" method="GET" className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input 
              name="q"
              defaultValue={q}
              placeholder="Search by tenant name..." 
              className="pl-10 h-10 w-72 bg-white border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-slate-100" 
            />
          </form>
          <Button variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-bold px-4">
            <Filter size={14} className="mr-2" /> All Types
          </Button>
        </div>
      </div>

      <div className="grid gap-8">
        {tenantsWithFiles.length > 0 ? (
          tenantsWithFiles.map((tenant) => (
            <div key={tenant.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm uppercase font-bold text-sm">
                    {tenant.name?.[0] || "T"}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tenant.name}</h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <User size={12} className="text-slate-400" /> 
                      Tenant ID: {tenant.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5">
                    <FileText size={12} /> {tenant.leases.length} Agreements
                  </div>
                  <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5">
                    <CreditCard size={12} /> {tenant.payments.length} Receipts
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Lease Agreements Section */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} /> Lease Agreements
                    </h4>
                    <div className="space-y-2">
                      {tenant.leases.map((lease) => (
                        <div key={lease.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white transition-all">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                              <FileText size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {lease.unit.property.name} - Unit {lease.unit.unitNumber}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                <Calendar size={10} /> 
                                {formatSystemDate(new Date(lease.startDate), "ETHIOPIAN")} - {formatSystemDate(new Date(lease.endDate), "ETHIOPIAN")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <FilePreview 
                              url={lease.leaseAgreementUrl!} 
                              filename={`${lease.unit.property.name} - Unit ${lease.unit.unitNumber} Lease`} 
                            />
                            <a href={lease.leaseAgreementUrl!} download>
                              <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100">
                                <Download size={14} />
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                      {tenant.leases.length === 0 && (
                        <p className="text-[10px] text-slate-400 font-medium italic">No uploaded agreements found.</p>
                      )}
                    </div>
                  </div>

                  {/* Payment Receipts Section */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard size={14} /> Payment Receipts
                    </h4>
                    <div className="space-y-2">
                      {tenant.payments.map((payment) => (
                        <div key={payment.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white transition-all">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                              <CreditCard size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {payment.amount.toLocaleString()} {settings.currency} - {payment.type}
                              </p>

                              <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                <Calendar size={10} /> 
                                {formatSystemDate(new Date(payment.createdAt), "ETHIOPIAN")}
                                <span className={cn(
                                  "ml-2 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase",
                                  payment.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : 
                                  payment.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                )}>
                                  {payment.status}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <FilePreview 
                              url={payment.receiptUrl!} 
                              filename={`Receipt - ${payment.amount} ${settings.currency}`} 
                            />
                            <a href={payment.receiptUrl!} download>
                              <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100">
                                <Download size={14} />
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                      {tenant.payments.length === 0 && (
                        <p className="text-[10px] text-slate-400 font-medium italic">No payment receipts found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-4">
              <FolderOpen size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No documents found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">There are currently no uploaded lease agreements or payment receipts in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
