import { getReportMetrics } from "@/lib/actions/reports";
import { getSystemSettings, getEffectiveCalendar } from "@/lib/actions/settings";
import { ReportsView } from "@/components/shared/reports-view";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AccountantReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") redirect("/auth/login");

  const [settings, calendarType, resolvedParams] = await Promise.all([
    getSystemSettings(),
    getEffectiveCalendar(),
    searchParams
  ]);

  const period = (resolvedParams?.period as string) || "30days";
  let startDate = new Date();
  let endDate = new Date();

  if (period === "30days") {
    startDate.setDate(startDate.getDate() - 30);
  } else if (period === "quarterly") {
    startDate.setDate(startDate.getDate() - 90);
  } else if (period === "6months") {
    startDate.setMonth(startDate.getMonth() - 6);
  } else if (period === "yearly") {
    startDate.setFullYear(startDate.getFullYear() - 1);
  }

  const metrics = await getReportMetrics(startDate, endDate);

  return (
    <ReportsView 
      metrics={metrics} 
      currency={settings.currency} 
      calendarType={calendarType}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
