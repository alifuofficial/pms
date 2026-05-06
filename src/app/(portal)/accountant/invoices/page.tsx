import { prisma } from "@/lib/prisma";
import { getSystemSettings, getEffectiveCalendar } from "@/lib/actions/settings";
import { InvoicesView } from "@/components/shared/invoices-view";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AccountantInvoicesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") redirect("/auth/login");

  const [settings, calendarType] = await Promise.all([
    getSystemSettings(),
    getEffectiveCalendar()
  ]);

  const payments = await prisma.payment.findMany({
    include: {
      tenant: true,
      lease: {
        include: {
          unit: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <InvoicesView 
      payments={payments} 
      currency={settings.currency} 
      calendarType={calendarType}
      role="ACCOUNTANT"
    />
  );
}
