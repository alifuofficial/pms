"use client";

import { useState, useEffect } from "react";
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
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Menu,
  AlertCircle,
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
  { title: "Penalties", href: "/admin/penalty", icon: AlertCircle, roles: ["ADMIN", "ACCOUNTANT"], isShared: false, group: "Finance" },
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

const COLLAPSED_WIDTH = "3.5rem";  // 56px — icon only
const EXPANDED_WIDTH  = "16rem";   // 256px — full

export function SidebarNav({ role, user }: { role: string; user: any }) {
  const pathname = usePathname();
  const userRoleLower = role.toLowerCase();
  const isDemo = pathname.startsWith("/admin/demo");

  // ── Collapsed state (desktop) ─────────────────────────────────
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("sidebar-collapsed");
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
  };

  // ── Filter & group items ──────────────────────────────────────
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

  // ── Shared nav content ────────────────────────────────────────
  const NavContent = ({ compact }: { compact: boolean }) => (
    <>
      {/* Logo */}
      <div className={cn(
        "border-b border-slate-100 flex items-center shrink-0",
        compact ? "h-14 justify-center px-0" : "h-14 px-4 gap-2"
      )}>
        <a
          href={isDemo ? "/admin/demo/dashboard" : `/${userRoleLower}/dashboard`}
          className={cn(
            "flex items-center gap-2.5 group min-w-0",
            compact && "justify-center"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 group-hover:bg-slate-700 transition-colors">
            <Building2 className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
          </div>
          {!compact && (
            <span className="font-semibold text-[15px] tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors truncate">
              Soreti PMS
            </span>
          )}
        </a>
        {!compact && (
          <button
            onClick={toggleCollapsed}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Demo banner */}
      {isDemo && !compact && (
        <div className="mx-3 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-center shrink-0">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Demo Active</span>
          <a href="/admin/dashboard" className="text-[10px] text-blue-600 hover:underline font-bold mt-0.5 block">
            Exit to Live
          </a>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className={cn("mb-3", compact && "mb-2")}>
            {!compact && (
              <p className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                {group}
              </p>
            )}
            {compact && <div className="h-px bg-slate-100 mx-1 mb-2 mt-1 first:hidden" />}
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
                  title={compact ? item.title : undefined}
                  className={cn(
                    "flex items-center rounded-lg h-9 text-sm font-medium transition-all duration-150 mb-0.5",
                    compact
                      ? "justify-center w-9 mx-auto px-0"
                      : "gap-2.5 px-3 w-full",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn(
                    "shrink-0",
                    compact ? "h-4 w-4" : "h-3.5 w-3.5",
                    isActive ? "text-white" : "text-slate-400"
                  )} />
                  {!compact && <span className="truncate">{item.title}</span>}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t border-slate-100 shrink-0",
        compact ? "py-3 px-1" : "p-3"
      )}>
        {!compact && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0">
              {user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                {user?.name || "User"}
              </p>
              <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                {role}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut()}
          title={compact ? "Sign Out" : undefined}
          className={cn(
            "flex items-center rounded-lg h-9 text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150",
            compact ? "justify-center w-9 mx-auto px-0" : "gap-2.5 px-3 w-full"
          )}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!compact && <span>Sign Out</span>}
        </button>

        {/* Expand button (compact mode only) */}
        {compact && (
          <button
            onClick={toggleCollapsed}
            title="Expand sidebar"
            className="flex items-center justify-center w-9 h-9 mx-auto rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150 mt-1"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );

  // Don't render until mounted so localStorage is read (avoids flash)
  const sidebarWidth = mounted && collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          maxWidth: sidebarWidth,
          transition: "width 220ms cubic-bezier(0.4,0,0.2,1), min-width 220ms cubic-bezier(0.4,0,0.2,1), max-width 220ms cubic-bezier(0.4,0,0.2,1)",
        }}
        className="hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-slate-200 shrink-0 z-30 overflow-hidden"
      >
        <NavContent compact={mounted && collapsed} />
      </aside>

      {/* ── Mobile hamburger button (shown in header) ──────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3.5 left-4 z-40 p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-4.5 w-4.5 h-[18px] w-[18px]" />
      </button>

      {/* ── Mobile overlay backdrop ─────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ───────────────────────────────────────── */}
      <aside
        style={{
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms cubic-bezier(0.4,0,0.2,1)",
          width: EXPANDED_WIDTH,
        }}
        className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 shadow-2xl"
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3.5 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
        <NavContent compact={false} />
      </aside>
    </>
  );
}