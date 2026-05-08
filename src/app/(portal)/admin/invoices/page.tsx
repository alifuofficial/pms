import { prisma } from "@/lib/prisma";
import { getSystemSettings, getEffectiveCalendar } from "@/lib/actions/settings";
import { InvoicesView } from "@/components/shared/invoices-view";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/auth/login");

  const [settings, calendarType] = await Promise.all([
    getSystemSettings(),
    getEffectiveCalendar()
  ]);

  const params = await searchParams;
  const page = parseInt((params?.page as string) || "1");
  const limit = 15;
  const skip = (page - 1) * limit;

  const [payments, totalCount] = await Promise.all([
    prisma.payment.findMany({
      include: {
        tenant: true,
        lease: { include: { unit: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count(),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <InvoicesView 
      payments={payments} 
      currency={settings.currency} 
      calendarType={calendarType}
      role="ADMIN"
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  );
}
