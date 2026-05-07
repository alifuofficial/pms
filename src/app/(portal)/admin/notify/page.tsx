import { getSmsTemplates } from "@/lib/actions/templates";
import { TemplateManager } from "@/components/shared/template-manager";
import { MessageSquare, Bell, Smartphone, ShieldCheck, RefreshCw } from "lucide-react";
import { processLateFees } from "@/lib/actions/notifications";
import { SyncButton } from "./sync-button"; // I'll create this client component

export default async function NotifyPage() {
  const templates = await getSmsTemplates();

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Notification Engine</h1>
          <p className="text-sm text-slate-500 font-medium">Manage automated SMS triggers and system-wide messaging templates.</p>
        </div>
        <SyncButton />
      </div>

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
            All templates configured here are dispatched via the SMS Ethiopia API. 
            Ensure your API key is active in <span className="font-bold text-slate-900 underline">Settings</span>.
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
            System automatically scans for overdue payments (Day 5 and Day 30) 
            and dispatches reminders if the corresponding template is enabled.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Logic</p>
            <p className="text-sm font-bold text-slate-900">OTP & Verification</p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            System templates for login verification and password resets can be 
            customized but cannot be deleted to prevent authentication failure.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-none overflow-hidden">
        <div className="p-8">
          <TemplateManager initialTemplates={templates} />
        </div>
      </div>
    </div>
  );
}
