import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/actions/settings";
import { ClearancePrintView } from "@/components/shared/clearance-print-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Print Clearance Certificate | Manager",
  description: "Print-friendly tenant leave clearance certificate.",
};

export default async function ManagerClearancePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    redirect("/auth/login");
  }

  const { id } = await params;
  const settings = await getSystemSettings();

  // Get properties managed by this manager
  const managedProperties = await prisma.property.findMany({
    where: { managerId: session.user.id },
    select: { id: true }
  });
  const propertyIds = managedProperties.map(p => p.id);

  const request = await prisma.leaveRequest.findFirst({
    where: {
      id,
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
        },
      },
      tenant: true,
      approver: true,
    },
  });

  if (!request) {
    return <div className="p-8 text-center text-red-500 font-semibold">Clearance request not found or unauthorized.</div>;
  }

  return <ClearancePrintView request={request} settings={settings} />;
}
