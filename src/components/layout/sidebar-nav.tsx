"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  Home, 
  CreditCard, 
  Settings, 
  ShieldAlert, 
  FileText,
  LogOut,
  Search,
  UserCog,
  MessageSquareText,
  FolderOpen,
  Activity,
  Zap
} from "lucide-react";

import { signOut } from "next-auth/react";

interface NavItem {
  title: string;
  href: string;
  icon: any;
  roles: string[];
  isShared?: boolean;
  group?: string;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "ACCOUNTANT", "TENANT"], isShared: true, group: "Overview" },
  
  { title: "Properties", href: "/properties", icon: Building2, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Management" },
  { title: "Units", href: "/units", icon: Home, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Management" },
  { title: "Tenants", href: "/tenants", icon: Users, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Management" },
  { title: "Lockout Portal", href: "/lockedout", icon: ShieldAlert, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Management" },
  { title: "Utilities", href: "/utilities", icon: Zap, roles: ["ADMIN", "MANAGER", "ACCOUNTANT"], isShared: true, group: "Management" },
  
  { title: "Payments", href: "/payments", icon: CreditCard, roles: ["ADMIN", "ACCOUNTANT"], isShared: true, group: "Finance" },
  { title: "Invoices", href: "/invoices", icon: FileText, roles: ["ADMIN", "ACCOUNTANT", "TENANT"], isShared: true, group: "Finance" },
  { title: "Reports", href: "/reports", icon: Activity, roles: ["ADMIN", "ACCOUNTANT"], isShared: true, group: "Finance" },
  
  { title: "Browse Units", href: "/browse", icon: Search, roles: ["TENANT"], isShared: true, group: "Marketplace" },
  { title: "My Leases", href: "/leases", icon: Home, roles: ["TENANT"], isShared: true, group: "Marketplace" },
  
  { title: "Staff Management", href: "/users", icon: UserCog, roles: ["ADMIN"], isShared: true, group: "System" },
  { title: "File Archive", href: "/files", icon: FolderOpen, roles: ["ADMIN", "MANAGER"], isShared: true, group: "System" },
  { title: "Notification Templates", href: "/notify", icon: MessageSquareText, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Communications" },
  { title: "Audit Logs", href: "/admin/audit-log", icon: ShieldAlert, roles: ["ADMIN"], isShared: false, group: "System" },
  { title: "Demo Sandbox", href: "/demo", icon: ShieldAlert, roles: ["ADMIN"], isShared: true, group: "System" },
  { title: "System Settings", href: "/settings", icon: Settings, roles: ["ADMIN"], isShared: true, group: "System" },
  { title: "Personal Settings", href: "/settings", icon: UserCog, roles: ["ACCOUNTANT", "MANAGER", "TENANT"], isShared: true, group: "System" },
];

export function SidebarNav({ role, user }: { role: string; user: any }) {
  const pathname = usePathname();
  const userRoleLower = role.toLowerCase();
  const isDemo = pathname.startsWith("/admin/demo");

  const filteredItems = navItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (isDemo) {
      const allowedDemoHrefs = ["/dashboard", "/properties", "/units", "/tenants", "/payments", "/settings"];
      if (item.href === "/demo") return true;
      if (!allowedDemoHrefs.includes(item.href)) return false;
    }
    return true;
  });

  const grouped = filteredItems.reduce((acc, item) => {
    const group = item.group || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <aside
      style={{ width: "16rem", minWidth: "16rem", maxWidth: "16rem" }}
      className="hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-slate-200 shrink-0 z-30"
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-100">
        <a
          href={isDemo ? "/admin/demo/dashboard" : `/${userRoleLower}/dashboard`}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-none shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
            Soreti PMS
          </span>
        </a>
        {isDemo && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Demo Sandbox Active</span>
            <a href="/admin/dashboard" className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-bold mt-1 block">
              Exit to Live Mode
            </a>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-4">
            <p className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              {group}
            </p>
            {items.map((item) => {
              let finalHref = item.isShared ? `/${userRoleLower}${item.href}` : item.href;
              if (isDemo && item.isShared && item.href !== "/demo" && item.href.startsWith("/")) {
                finalHref = `/admin/demo${item.href}`;
              }
              const isActive = pathname === finalHref || pathname.startsWith(finalHref + "/");

              return (
                <a
                  key={item.title + item.href}
                  href={finalHref}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 h-9 text-sm font-medium transition-all duration-200 mb-0.5",
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-slate-900" : "text-slate-400")} />
                  <span>{item.title}</span>
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
            {user?.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {user?.name || "User"}
            </p>
            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
              {role}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 rounded-lg px-3 h-9 text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}