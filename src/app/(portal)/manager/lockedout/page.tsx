import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/actions/settings";
import { LockedOutView } from "@/components/shared/locked-out-view";
import { getLeaseUncollectedBalance } from "@/lib/arrears";

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

  const rawLeases = await prisma.lease.findMany({
    where: {
      status: { in: ["LOCKED_OUT", "SEALED"] },
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
      payments: true,
      penalties: true,
      utilityBills: true,
      refunds: true,
      lockoutFees: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const lockedOutLeases = rawLeases.map(lease => {
    const balance = getLeaseUncollectedBalance(lease, settings);
    return {
      ...lease,
      totalUncollected: balance.totalUncollected,
      rentUncollected: balance.rentUncollected,
      penaltiesUncollected: balance.penaltiesUncollected,
      utilitiesUncollected: balance.utilitiesUncollected
    };
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
