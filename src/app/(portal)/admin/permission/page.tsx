import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUsersWithPermissions } from "@/lib/actions/permissions";
import { PermissionsManager } from "@/components/shared/permissions-manager";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPermissionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/login");
  }

  const res = await getUsersWithPermissions();
  if (!res.success || !res.users) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-100 max-w-md mx-auto mt-20 space-y-3">
        <h2 className="text-lg font-bold text-red-600">Error Loading Permissions</h2>
        <p className="text-sm text-slate-500 font-medium">{res.error || "Failed to load users list."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10 px-4 sm:px-6">
      {/* Header section */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Shield size={20} />
        </div>
        <div className="space-y-0.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">User Access Control</h1>
          <p className="text-xs text-slate-500 font-medium">Control staff and tenant permissions to access modules dynamically.</p>
        </div>
      </div>

      {/* Permissions Manager Mounting */}
      <PermissionsManager initialUsers={res.users} />
    </div>
  );
}
