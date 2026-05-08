import { prisma } from "@/lib/prisma";
import { getSmsTemplates } from "@/lib/actions/templates";
import { TemplateManager } from "@/components/shared/template-manager";
import { NotifyTabs } from "./notify-tabs";
import { MessageSquare, Bell, Smartphone, ShieldCheck } from "lucide-react";
import { SyncButton } from "./sync-button";

export default async function NotifyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const activeTab = (params?.tab as string) || "templates";

  const templates = await getSmsTemplates();

  // SMS Logs pagination
  const logsPage = parseInt((params?.page as string) || "1");
  const logsLimit = 20;
  const logsSkip = (logsPage - 1) * logsLimit;

  const [logs, logsTotal] = await Promise.all([
    prisma.smsLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: logsSkip,
      take: logsLimit,
    }),
    prisma.smsLog.count(),
  ]);

  const logsTotalPages = Math.ceil(logsTotal / logsLimit);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Notification Engine</h1>
          <p className="text-sm text-slate-500 font-medium">Manage automated SMS triggers, templates, and delivery logs.</p>
        </div>
        <SyncButton />
      </div>

      {/* ── Stats Row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Smartphone size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Channel</p>
            <p className="text-sm font-bold text-slate-900">SMS Ethiopia Gateway</p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            All templates are dispatched via the SMS Ethiopia API. Ensure your API key is active in <span className="font-bold text-slate-900 underline">Settings</span>.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Bell size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Automated Triggers</p>
            <p className="text-sm font-bold text-slate-900">Late Fee Reminders</p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            System scans for overdue payments (Day 5 and Day 30) and dispatches reminders if the template is enabled.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Logs</p>
            <p className="text-2xl font-black text-slate-900">{logsTotal.toLocaleString()}</p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            Total SMS attempts recorded by the system across all channels and triggers.
          </p>
        </div>
      </div>

      {/* ── Tabbed Content ─────────────────────────────── */}
      <NotifyTabs
        activeTab={activeTab}
        templates={templates}
        logs={logs}
        logsPage={logsPage}
        logsTotalPages={logsTotalPages}
        logsTotal={logsTotal}
      />
    </div>
  );
}
