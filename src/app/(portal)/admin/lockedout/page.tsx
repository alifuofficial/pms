import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/actions/settings";
import { LockedOutView } from "@/components/shared/locked-out-view";

export const dynamic = "force-dynamic";

export default async function AdminLockedOutPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/login");
  }

  const settings = await getSystemSettings();

  const lockedOutLeases = await prisma.lease.findMany({
    where: {
      status: "LOCKED_OUT",
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
        isAdmin={true} 
      />
    </div>
  );
}
