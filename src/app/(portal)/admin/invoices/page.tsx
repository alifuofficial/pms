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

  const [allRentPayments, allUtilityBills] = await Promise.all([
    prisma.payment.findMany({
      include: { 
        tenant: true,
        lease: { include: { unit: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.utilityBill.findMany({
      include: {
        tenant: true,
        lease: { include: { unit: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const mappedUtilities = allUtilityBills.map(u => ({
    id: u.id,
    leaseId: u.leaseId,
    tenantId: u.tenantId,
    amount: u.amount,
    status: u.status === "PAID" ? "APPROVED" : u.status === "UNPAID" ? "PENDING" : u.status,
    receiptUrl: u.receiptUrl,
    senderName: u.senderName,
    transactionId: u.transactionId,
    bankAccountId: u.bankAccountId,
    createdAt: u.createdAt,
    dueDate: u.dueDate,
    type: u.type,
    tenant: u.tenant,
    lease: u.lease,
    billingMonth: u.billingMonth,
    isUtility: true
  }));

  const combinedRecords = [...allRentPayments, ...mappedUtilities].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalCount = combinedRecords.length;
  const payments = combinedRecords.slice(skip, skip + limit);

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
