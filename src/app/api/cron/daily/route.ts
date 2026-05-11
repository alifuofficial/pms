import { NextResponse } from "next/server";
import { processLateFees, processDailyAlerts } from "@/lib/actions/notifications";

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

    return NextResponse.json({ 
      success: true, 
      alertsProcessed: alertsResult.success ? alertsResult.processedCount : 0,
      lateFeesProcessed: lateFeesResult.success ? lateFeesResult.processedCount : 0 
    });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: "Failed to run cron job" }, { status: 500 });
  }
}
