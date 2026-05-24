import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const [settings, bankAccounts, totalUnits, unitsWithQr] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { id: "global" } }),
    prisma.bankAccount.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.unit.count(),
    prisma.unit.count({
      where: {
        AND: [
          { qrSlug: { not: null } },
          { qrSlug: { not: "" } }
        ]
      }
    })
  ]);

  const defaultSettings = {
    systemName: "Soreti Property Rental",
    organizationName: "Soreti International Trading",
    logoUrl: "",
    supportEmail: "support@soreti.com",
    currency: "USD",
  };

  const qrStats = {
    totalUnits,
    unitsWithQr,
    unitsWithoutQr: Math.max(0, totalUnits - unitsWithQr)
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">System Configuration</h1>
        <p className="text-sm text-slate-500 font-medium">Manage global branding and institutional profiles.</p>
      </div>

      <SettingsForm 
        initialData={settings || defaultSettings} 
        initialBankAccounts={bankAccounts} 
        qrStats={qrStats}
      />
    </div>
  );
}
