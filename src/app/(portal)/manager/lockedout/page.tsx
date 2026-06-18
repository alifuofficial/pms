import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/actions/settings";
import { LockedOutView } from "@/components/shared/locked-out-view";

export const dynamic = "force-dynamic";

export default async function ManagerLockedOutPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    redirect("/auth/login");
  }

  const settings = await getSystemSettings();

  // Get managed properties
  const managedProperties = await prisma.property.findMany({
    where: { managerId: session.user.id },
    select: { id: true }
  });
  const propertyIds = managedProperties.map(p => p.id);

  const lockedOutLeases = await prisma.lease.findMany({
    where: {
      status: "LOCKED_OUT",
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
      seizedProperties: true,
      payments: {
        where: {
          type: "FINAL_SETTLEMENT",
        },
      },
      refunds: true,
    },
    orderBy: {
      terminatedAt: "desc",
    },
  });

  return (
    <div className="max-w-[1200px] mx-auto animate-in fade-in duration-700">
      <LockedOutView 
        lockedOutLeases={lockedOutLeases} 
        currency={settings.currency} 
        isAdmin={false} 
      />
    </div>
  );
}
