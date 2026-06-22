import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/actions/settings";
import { ClearancePrintView } from "@/components/shared/clearance-print-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Print Clearance Certificate | Admin",
  description: "Print-friendly tenant leave clearance certificate.",
};

export default async function AdminClearancePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const settings = await getSystemSettings();

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
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
    return <div className="p-8 text-center text-red-500 font-semibold">Clearance request not found.</div>;
  }

  return <ClearancePrintView request={request} settings={settings} />;
}
