import { NextResponse } from "next/server";
import { processLateFees, processDailyAlerts } from "@/lib/actions/notifications";
import { runDailyQrBackup } from "@/lib/actions/import-export";
import { prisma } from "@/lib/prisma";
import { getNowInAddisAbaba } from "@/lib/calendar";

export async function GET(request: Request) {
  // Simple auth check to ensure only the cron job runner can trigger this
  // In a real production setup with Vercel, use Vercel Cron headers.
  // For standard environments, use an environment variable secret.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const alertsResult = await processDailyAlerts();
    const lateFeesResult = await processLateFees();
    const backupResult = await runDailyQrBackup();

    // Update lastCronRun so that the background fallback doesn't run today
    try {
      await prisma.systemSettings.update({
        where: { id: "global" },
        data: { lastCronRun: getNowInAddisAbaba() }
      });
    } catch (dbErr) {
      console.error("Failed to update lastCronRun in cron route:", dbErr);
    }

    return NextResponse.json({ 
      success: true, 
      alertsProcessed: alertsResult.success ? alertsResult.processedCount : 0,
      lateFeesProcessed: lateFeesResult.success ? lateFeesResult.processedCount : 0,
      qrBackupProcessed: backupResult.success
    });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: "Failed to run cron job" }, { status: 500 });
  }
}
