import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/actions/settings";
import { TenantLeasesView } from "@/components/shared/tenant-leases-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Leases | Tenant",
  description: "Manage your active lease contract, outstanding balances, and vacancy requests.",
};

export default async function TenantLeasesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TENANT") {
    redirect("/auth/login");
  }

  const settings = await getSystemSettings();

  const [leases, leaveRequests] = await Promise.all([
    prisma.lease.findMany({
      where: { tenantId: session.user.id },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        payments: true,
        penalties: true,
        utilityBills: true,
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.leaveRequest.findMany({
      where: { tenantId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="pb-10 animate-in fade-in duration-700">
      <TenantLeasesView
        leases={leases}
        leaveRequests={leaveRequests}
        currency={settings.currency}
      />
    </div>
  );
}
