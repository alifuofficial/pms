import { PaymentsView } from "@/components/shared/payments-view";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function TenantPaymentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TENANT") {
    redirect("/auth/login");
  }

  return (
    <div className="pb-10">
      <PaymentsView title="My Payments" tenantId={session.user.id} role="TENANT" />
    </div>
  );
}
