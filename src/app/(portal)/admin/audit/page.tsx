import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Shield, Search, Filter, History, User, Clock, Terminal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Audit History</h1>
          <p className="text-sm text-slate-500 font-medium">Full traceability of system-wide administrative actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search actions or users..." className="pl-9 h-9 w-64 bg-white border-slate-200 rounded-lg text-sm" />
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 text-xs font-semibold">
            <Filter size={14} className="mr-2" /> Filter
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-3 px-6">Administrative Action</th>
              <th className="py-3 px-6">Operator</th>
              <th className="py-3 px-6">Timestamp</th>
              <th className="py-3 px-6 text-right">Reference ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100 shrink-0">
                        <Terminal size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                          {log.metadata || "No additional metadata"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                        <User size={12} />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">{log.user.name}</p>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {log.id.slice(0, 12).toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <History size={32} strokeWidth={1.5} className="opacity-50" />
                    <p className="text-xs font-medium italic">No administrative events recorded yet.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
