import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { UtilitiesView } from "@/components/shared/utilities-view";

export default async function AccountantUtilitiesPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [properties, bankAccounts, settings] = await Promise.all([
    prisma.property.findMany({
      where: { accountantId: session.user.id },
      orderBy: { name: "asc" }
    }),
    prisma.bankAccount.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.systemSettings.findUnique({ where: { id: "global" } })
  ]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Utility Settlement Ledger</h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Verify and reconcile tenant electricity and water payments.</p>
        </div>
      </div>
      
      <UtilitiesView 
        properties={properties} 
        bankAccounts={bankAccounts} 
        currency={settings?.currency || "ETB"} 
        calendarType={settings?.calendarType || "ETHIOPIAN"}
        role="ACCOUNTANT" 
      />
    </div>
  );
}
