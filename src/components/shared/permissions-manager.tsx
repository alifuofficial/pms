"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Building2, 
  Home, 
  Users, 
  Receipt, 
  Zap, 
  Settings,
  ShieldCheck,
  UserCog,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { toggleUserPermission } from "@/lib/actions/permissions";
import { cn } from "@/lib/utils";

interface UserWithPermissions {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  canManageProperties: boolean;
  canManageUnits: boolean;
  canManageTenants: boolean;
  canManagePayments: boolean;
  canManageUtilities: boolean;
  canManageSettings: boolean;
}

interface PermissionsManagerProps {
  initialUsers: UserWithPermissions[];
}

const ROLES = ["ALL", "ADMIN", "MANAGER", "ACCOUNTANT", "TENANT"];

export function PermissionsManager({ initialUsers }: PermissionsManagerProps) {
  const [usersList, setUsersList] = useState<UserWithPermissions[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [updating, setUpdating] = useState<{ userId: string; field: string } | null>(null);

  const handleToggle = async (
    userId: string,
    field:
      | "canManageProperties"
      | "canManageUnits"
      | "canManageTenants"
      | "canManagePayments"
      | "canManageUtilities"
      | "canManageSettings",
    currentValue: boolean
  ) => {
    setUpdating({ userId, field });
    const newValue = !currentValue;

    try {
      const res = await toggleUserPermission(userId, field, newValue);
      if (res.success) {
        setUsersList((prev) =>
          prev.map((user) => (user.id === userId ? { ...user, [field]: newValue } : user))
        );
        toast.success("Permission updated successfully");
      } else {
        toast.error(res.error || "Failed to update permission");
      }
    } catch (e: any) {
      toast.error(e.message || "An unexpected error occurred");
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = usersList.filter((user) => {
    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "ALL" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 border",
                selectedRole === role
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              {role === "ALL" ? "All Users" : role}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-sm font-medium rounded-xl h-10 shadow-sm focus-visible:ring-slate-900"
          />
        </div>
      </div>

      {/* Users Permissions Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredUsers.length === 0 ? (
          <Card className="border-slate-200 bg-white rounded-2xl shadow-sm text-center p-12">
            <CardContent className="space-y-3">
              <UserCog size={36} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-900">No users found matching the filters</p>
              <p className="text-xs text-slate-400 font-medium font-sans">Try adjusting your search criteria or role tabs.</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const isAdmin = user.role === "ADMIN";

            return (
              <Card
                key={user.id}
                className={cn(
                  "border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300",
                  isAdmin && "bg-slate-50/40 border-slate-200/60"
                )}
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* User Profile Info */}
                  <div className="flex items-center gap-4 shrink-0 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-lg shadow-sm">
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 tracking-tight truncate">{user.name || "Unnamed User"}</h3>
                        <Badge
                          className={cn(
                            "font-bold text-[9px] px-2 py-0.5 rounded border uppercase tracking-wider",
                            user.role === "ADMIN" ? "bg-red-50 text-red-600 border-red-200" :
                            user.role === "MANAGER" ? "bg-indigo-50 text-indigo-600 border-indigo-200" :
                            user.role === "ACCOUNTANT" ? "bg-amber-50 text-amber-600 border-amber-200" :
                            "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-450 font-medium font-sans truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  {/* Permissions Settings Controls */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
                    {/* Properties */}
                    <PermissionToggle
                      icon={<Building2 size={13} />}
                      label="Properties"
                      field="canManageProperties"
                      value={user.canManageProperties}
                      isAdmin={isAdmin}
                      loading={updating?.userId === user.id && updating?.field === "canManageProperties"}
                      onToggle={() => handleToggle(user.id, "canManageProperties", user.canManageProperties)}
                    />

                    {/* Units */}
                    <PermissionToggle
                      icon={<Home size={13} />}
                      label="Units"
                      field="canManageUnits"
                      value={user.canManageUnits}
                      isAdmin={isAdmin}
                      loading={updating?.userId === user.id && updating?.field === "canManageUnits"}
                      onToggle={() => handleToggle(user.id, "canManageUnits", user.canManageUnits)}
                    />

                    {/* Tenants */}
                    <PermissionToggle
                      icon={<Users size={13} />}
                      label="Tenants & Leases"
                      field="canManageTenants"
                      value={user.canManageTenants}
                      isAdmin={isAdmin}
                      loading={updating?.userId === user.id && updating?.field === "canManageTenants"}
                      onToggle={() => handleToggle(user.id, "canManageTenants", user.canManageTenants)}
                    />

                    {/* Payments */}
                    <PermissionToggle
                      icon={<Receipt size={13} />}
                      label="Payments & Fees"
                      field="canManagePayments"
                      value={user.canManagePayments}
                      isAdmin={isAdmin}
                      loading={updating?.userId === user.id && updating?.field === "canManagePayments"}
                      onToggle={() => handleToggle(user.id, "canManagePayments", user.canManagePayments)}
                    />

                    {/* Utilities */}
                    <PermissionToggle
                      icon={<Zap size={13} />}
                      label="Utility Bills"
                      field="canManageUtilities"
                      value={user.canManageUtilities}
                      isAdmin={isAdmin}
                      loading={updating?.userId === user.id && updating?.field === "canManageUtilities"}
                      onToggle={() => handleToggle(user.id, "canManageUtilities", user.canManageUtilities)}
                    />

                    {/* Settings */}
                    <PermissionToggle
                      icon={<Settings size={13} />}
                      label="Sys Settings"
                      field="canManageSettings"
                      value={user.canManageSettings}
                      isAdmin={isAdmin}
                      loading={updating?.userId === user.id && updating?.field === "canManageSettings"}
                      onToggle={() => handleToggle(user.id, "canManageSettings", user.canManageSettings)}
                    />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

interface PermissionToggleProps {
  icon: React.ReactNode;
  label: string;
  field: string;
  value: boolean;
  isAdmin: boolean;
  loading: boolean;
  onToggle: () => void;
}

function PermissionToggle({ icon, label, value, isAdmin, loading, onToggle }: PermissionToggleProps) {
  const isEnabled = isAdmin || value;

  return (
    <div
      onClick={!isAdmin && !loading ? onToggle : undefined}
      className={cn(
        "flex flex-col p-3 rounded-xl border transition-all duration-200 relative select-none",
        isAdmin ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" :
        value
          ? "bg-indigo-50/50 text-indigo-700 border-indigo-200 hover:border-indigo-300 cursor-pointer shadow-sm"
          : "bg-white text-slate-450 border-slate-200 hover:bg-slate-50/60 hover:text-slate-700 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn(isEnabled ? "text-indigo-600" : "text-slate-400")}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[9.5px] font-extrabold">
          {isAdmin ? "MASTER" : value ? "ENABLED" : "DISABLED"}
        </span>

        {loading ? (
          <Loader2 size={13} className="animate-spin text-indigo-650" />
        ) : isAdmin ? (
          <ShieldCheck size={14} className="text-emerald-500" />
        ) : (
          <div
            className={cn(
              "w-7 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out",
              value ? "bg-indigo-600" : "bg-slate-200"
            )}
          >
            <div
              className={cn(
                "w-3 h-3 rounded-full bg-white shadow transform duration-200 ease-in-out",
                value ? "translate-x-3" : "translate-x-0"
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
