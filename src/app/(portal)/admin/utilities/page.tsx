import { prisma } from "@/lib/prisma";
import { UtilitiesView } from "@/components/shared/utilities-view";

export default async function AdminUtilitiesPage() {
  const [properties, bankAccounts, settings] = await Promise.all([
    prisma.property.findMany({ orderBy: { name: "asc" } }),
    prisma.bankAccount.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.systemSettings.findUnique({ where: { id: "global" } })
  ]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Utility Billing Portal</h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Record and verify tenant electricity and water bills.</p>
        </div>
      </div>
      
      <UtilitiesView 
        properties={properties} 
        bankAccounts={bankAccounts} 
        currency={settings?.currency || "ETB"} 
        calendarType={settings?.calendarType || "ETHIOPIAN"}
        role="ADMIN" 
      />
    </div>
  );
}
