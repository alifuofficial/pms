import { getSmsTemplates } from "@/lib/actions/templates";
import { TemplateManager } from "@/components/shared/template-manager";
import { MessageSquareText } from "lucide-react";

export default async function NotifyPage() {
  const templates = await getSmsTemplates();

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <MessageSquareText className="w-6 h-6 text-indigo-600" />
            Notification Center
          </h1>
          <p className="text-sm text-slate-500 font-medium">Manage SMS templates and dispatch notifications via SMS Ethiopia.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6">
          <TemplateManager initialTemplates={templates} />
        </div>
      </div>
    </div>
  );
}
