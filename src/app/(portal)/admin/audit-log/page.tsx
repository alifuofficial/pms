import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Activity, User, ChevronLeft } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/auth/login");

  const page = parseInt((searchParams?.page as string) || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs font-semibold">
                <ChevronLeft size={14} className="mr-1" /> Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Audit Logs</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium pl-1">
            Full system activity trail — {totalCount.toLocaleString()} events recorded
          </p>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-3 px-6">Event</th>
              <th className="py-3 px-6">Actor</th>
              <th className="py-3 px-6">Date & Time</th>
              <th className="py-3 px-6">Relative</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <Activity size={28} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No activity recorded yet</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <Activity size={14} />
                      </div>
                      <p className="text-sm font-medium text-slate-800 leading-snug max-w-md">
                        {log.action}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    {(log as any).user ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                          {(log as any).user.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 leading-none">{(log as any).user.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{(log as any).user.role}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-medium uppercase">System</span>
                    )}
                  </td>
                  <td className="py-3 px-6">
                    <p className="text-xs font-medium text-slate-600 tabular-nums">
                      {format(new Date(log.createdAt), "MMM d, yyyy")}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium tabular-nums">
                      {format(new Date(log.createdAt), "HH:mm:ss")}
                    </p>
                  </td>
                  <td className="py-3 px-6">
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  );
}
