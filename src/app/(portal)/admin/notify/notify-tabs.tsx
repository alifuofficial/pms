"use client";

import { useRouter, usePathname } from "next/navigation";
import { TemplateManager } from "@/components/shared/template-manager";
import { BroadcastComposer } from "@/components/shared/broadcast-composer";
import { cn } from "@/lib/utils";
import { MessageSquare, FileText, CheckCircle2, XCircle, Clock, AlertCircle, Megaphone } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; className: string; Icon: any }> = {
  SUCCESS:  { label: "Delivered",  className: "bg-emerald-50 text-emerald-600 border-emerald-100", Icon: CheckCircle2 },
  FAILED:   { label: "Failed",     className: "bg-red-50 text-red-500 border-red-100",             Icon: XCircle },
  SKIPPED:  { label: "Skipped",    className: "bg-slate-50 text-slate-400 border-slate-200",       Icon: AlertCircle },
  DISABLED: { label: "Disabled",   className: "bg-amber-50 text-amber-500 border-amber-100",       Icon: AlertCircle },
  PENDING:  { label: "Pending",    className: "bg-blue-50 text-blue-500 border-blue-100",          Icon: Clock },
};

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (p: number) => {
    router.push(`${pathname}?tab=logs&page=${p}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50">
      <p className="text-xs text-slate-400 font-medium">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function NotifyTabs({
  activeTab,
  templates,
  logs,
  logsPage,
  logsTotalPages,
  logsTotal,
  broadcastData,
}: {
  activeTab: string;
  templates: any[];
  logs: any[];
  logsPage: number;
  logsTotalPages: number;
  logsTotal: number;
  broadcastData: any;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { id: "templates", label: "SMS Templates", icon: FileText },
    { id: "broadcast", label: "Send Broadcast", icon: Megaphone },
    { id: "logs",      label: "SMS Logs",      icon: MessageSquare, badge: logsTotal },
  ];

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-none overflow-hidden">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-100 px-6 pt-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(`${pathname}?tab=${tab.id}`)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all -mb-px",
              activeTab === tab.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon size={13} />
            {tab.label}
            {tab.badge !== undefined && (
              <span className="ml-1 bg-slate-100 text-slate-500 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {tab.badge.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="p-8">
          <TemplateManager initialTemplates={templates} />
        </div>
      )}

      {/* Broadcast Tab */}
      {activeTab === "broadcast" && (
        <div className="p-8">
          <BroadcastComposer
            tenants={broadcastData?.tenants || []}
            properties={broadcastData?.properties || []}
          />
        </div>
      )}

      {/* SMS Logs Tab */}
      {activeTab === "logs" && (
        <div>
          {logs.length === 0 ? (
            <div className="py-20 text-center">
              <MessageSquare size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400 font-medium">No SMS logs recorded yet.</p>
              <p className="text-xs text-slate-300 mt-1">Logs appear after the first SMS is dispatched.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Recipient</th>
                  <th className="py-3 px-6">Message</th>
                  <th className="py-3 px-6">Source</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => {
                  const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG["PENDING"];
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6">
                        <p className="text-sm font-semibold text-slate-900 font-mono">{log.msisdn}</p>
                      </td>
                      <td className="py-3 px-6 max-w-xs">
                        <p className="text-xs text-slate-600 font-medium truncate">{log.message}</p>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          {log.source || "system"}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-tight border",
                          cfg.className
                        )}>
                          <cfg.Icon size={10} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <p className="text-xs font-medium text-slate-600 tabular-nums">
                          {format(new Date(log.createdAt), "MMM d, HH:mm")}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <Pagination page={logsPage} totalPages={logsTotalPages} />
        </div>
      )}
    </div>
  );
}
