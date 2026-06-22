import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/actions/settings";
import { LeaveClearanceView } from "@/components/shared/leave-clearance-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leave & Clearance | Manager",
  description: "Manage tenant move-out requests, notice penalties, and clearance papers for your properties.",
};

export default async function ManagerLeaveClearancePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    redirect("/auth/login");
  }

  const settings = await getSystemSettings();

  // Get properties managed by this manager
  const managedProperties = await prisma.property.findMany({
    where: { managerId: session.user.id },
    select: { id: true }
  });
  const propertyIds = managedProperties.map(p => p.id);

  const [requests, activeLeases] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        lease: {
          unit: {
            propertyId: { in: propertyIds }
          }
        }
      },
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
      where: { 
        status: "ACTIVE",
        unit: {
          propertyId: { in: propertyIds }
        }
      },
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
