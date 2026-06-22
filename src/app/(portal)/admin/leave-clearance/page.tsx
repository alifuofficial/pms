import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/actions/settings";
import { LeaveClearanceView } from "@/components/shared/leave-clearance-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leave & Clearance | Admin",
  description: "Manage tenant move-out requests, notice penalties, and clearance papers.",
};

export default async function AdminLeaveClearancePage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    redirect("/auth/login");
  }

  const settings = await getSystemSettings();

  const [requests, activeLeases] = await Promise.all([
    prisma.leaveRequest.findMany({
      include: {
        lease: {
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
        },
        tenant: true,
        approver: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lease.findMany({
      where: { status: "ACTIVE" },
      include: {
        tenant: true,
        unit: {
          include: {
            property: true,
          },
        },
      },
      orderBy: {
        tenant: {
          name: "asc"
        }
      }
    }),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto animate-in fade-in duration-700">
      <LeaveClearanceView
        leaveRequests={requests as any}
        activeLeases={activeLeases as any}
        currency={settings.currency}
        role={session.user.role}
      />
    </div>
  );
}
