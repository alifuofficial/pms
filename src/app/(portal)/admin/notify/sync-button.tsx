"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { syncAllDailyNotifications } from "@/lib/actions/notifications";
import { toast } from "sonner";

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await syncAllDailyNotifications();
    setIsSyncing(false);

    if (result.success) {
      toast.success(`Sync complete. Processed ${result.lateFeesProcessed} penalties/reminders and ${result.alertsProcessed} expiry alerts.`);
    } else {
      toast.error(result.error || "Sync failed.");
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={isSyncing}
      className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-6 rounded-xl text-xs shadow-lg shadow-slate-900/10 uppercase tracking-wider"
    >
      {isSyncing ? <Loader2 size={14} className="mr-2 animate-spin" /> : <RefreshCw size={14} className="mr-2" />}
      Sync Alerts & Penalties
    </Button>
  );
}
