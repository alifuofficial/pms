import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, ShieldCheck, Mail, MoreHorizontal, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AddUserDialog } from "@/components/shared/add-user-dialog";
import { UserActions } from "@/components/shared/user-actions";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: {
      role: { not: "TENANT" }
    },
    include: {
      managedProperties: { select: { id: true } },
      accountantProperties: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 font-medium">Control system access and assign staff roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search users..." className="pl-9 h-9 w-64 bg-white border-slate-200 rounded-lg text-sm" />
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 text-xs font-semibold">
            <Filter size={14} className="mr-2" /> Filter
          </Button>
          <AddUserDialog />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-3 px-6">User Identity</th>
              <th className="py-3 px-6">Role & Permissions</th>
              <th className="py-3 px-6">Security</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-semibold text-xs border border-slate-200 uppercase">
                      {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Mail size={10} /> {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-6">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold uppercase border tracking-tight",
                    user.role === "ADMIN" && "bg-slate-900 text-white border-slate-900",
                    user.role === "MANAGER" && "bg-blue-50 text-blue-700 border-blue-100",
                    user.role === "ACCOUNTANT" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                    user.role === "TENANT" && "bg-slate-50 text-slate-700 border-slate-100"
                  )}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-6">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <ShieldCheck size={12} className="text-blue-500" />
                    <span>Verified Access</span>
                  </div>
                </td>
                <td className="py-3 px-6 text-right">
                  <UserActions user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
