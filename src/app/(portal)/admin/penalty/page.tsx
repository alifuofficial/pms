import { PenaltyManagementView } from "@/components/shared/penalty-management-view";
import { getCombinedPenalties } from "@/lib/actions/penalties";
import { getSystemSettings } from "@/lib/actions/settings";

export const metadata = {
  title: "Penalty Management | Admin",
  description: "Review and waive outstanding late-fee penalties across all units.",
};

export default async function AdminPenaltyPage() {
  const [penalties, settings] = await Promise.all([
    getCombinedPenalties(),
    getSystemSettings(),
  ]);

  return (
    <PenaltyManagementView
      penalties={penalties as any}
      currency={settings.currency}
    />
  );
}
