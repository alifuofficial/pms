import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const [settings, bankAccounts] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { id: "global" } }),
    prisma.bankAccount.findMany({ orderBy: { createdAt: "desc" } })
  ]);

  const defaultSettings = {
    systemName: "NexusPMS",
    organizationName: "Nexus Portfolio Management",
    logoUrl: "",
    supportEmail: "support@nexuspms.com",
    currency: "USD",
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">System Configuration</h1>
        <p className="text-sm text-slate-500 font-medium">Manage global branding and institutional profiles.</p>
      </div>

      <SettingsForm initialData={settings || defaultSettings} initialBankAccounts={bankAccounts} />
    </div>
  );
}
