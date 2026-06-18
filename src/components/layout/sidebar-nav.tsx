"use client";

import Link from "next/link";
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
  ChevronRight,
  Search,
  UserCog,
  MessageSquareText,
  FolderOpen,
  Activity,
  Zap
} from "lucide-react";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";

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
  
  // Property Management
  { title: "Properties", href: "/properties", icon: Building2, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Management" },
  { title: "Units", href: "/units", icon: Home, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Management" },
  { title: "Tenants", href: "/tenants", icon: Users, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Management" },
  { title: "Lockout Portal", href: "/lockedout", icon: ShieldAlert, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Management" },
  { title: "Utilities", href: "/utilities", icon: Zap, roles: ["ADMIN", "MANAGER", "ACCOUNTANT"], isShared: true, group: "Management" },
  
  // Finance
  { title: "Payments", href: "/payments", icon: CreditCard, roles: ["ADMIN", "ACCOUNTANT"], isShared: true, group: "Finance" },
  { title: "Invoices", href: "/invoices", icon: FileText, roles: ["ADMIN", "ACCOUNTANT", "TENANT"], isShared: true, group: "Finance" },
  { title: "Reports", href: "/reports", icon: Activity, roles: ["ADMIN", "ACCOUNTANT"], isShared: true, group: "Finance" },
  
  // Tenant
  { title: "Browse Units", href: "/browse", icon: Search, roles: ["TENANT"], isShared: true, group: "Marketplace" },
  { title: "My Leases", href: "/leases", icon: Home, roles: ["TENANT"], isShared: true, group: "Marketplace" },
  
  // Admin
  { title: "Staff Management", href: "/users", icon: UserCog, roles: ["ADMIN"], isShared: true, group: "System" },
  { title: "File Archive", href: "/files", icon: FolderOpen, roles: ["ADMIN", "MANAGER"], isShared: true, group: "System" },
  { title: "Notification Templates", href: "/notify", icon: MessageSquareText, roles: ["ADMIN", "MANAGER"], isShared: true, group: "Communications" },
  { title: "Audit Logs", href: "/admin/audit-log", icon: ShieldAlert, roles: ["ADMIN"], isShared: true, group: "System" },
  { title: "Demo Sandbox", href: "/demo", icon: ShieldAlert, roles: ["ADMIN"], isShared: true, group: "System" },
  { title: "System Settings", href: "/settings", icon: Settings, roles: ["ADMIN"], isShared: true, group: "System" },
  { title: "Personal Settings", href: "/settings", icon: UserCog, roles: ["ACCOUNTANT", "MANAGER", "TENANT"], isShared: true, group: "System" },

];

export function SidebarNav({ role, user }: { role: string; user: any }) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const userRoleLower = role.toLowerCase();
  const isDemo = pathname.startsWith("/admin/demo");
  
  const filteredItems = navItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (isDemo) {
      // Show only simulated pages in Demo mode
      const allowedDemoHrefs = ["/dashboard", "/properties", "/units", "/tenants", "/payments", "/settings"];
      if (item.href === "/demo") return true;
      if (!allowedDemoHrefs.includes(item.href)) return false;
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
      <SidebarHeader className="p-4">
        <Link href={isDemo ? "/admin/demo/dashboard" : `/${userRoleLower}/dashboard`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-none shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-lg tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              Soreti PMS
            </span>
          )}
        </Link>
        {isDemo && !isCollapsed && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Demo Sandbox Active</span>
            <Link href="/admin/dashboard" className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-bold mt-1 block">
              Exit to Live Mode
            </Link>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <SidebarMenu className="gap-1">
          {Object.entries(
            filteredItems.reduce((acc, item) => {
              const group = item.group || "Other";
              if (!acc[group]) acc[group] = [];
              acc[group].push(item);
              return acc;
            }, {} as Record<string, NavItem[]>)
          ).map(([group, items]) => (
            <div key={group} className="mb-3">
              {!isCollapsed && (
                <p className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  {group}
                </p>
              )}
              {items.map((item) => {
                let finalHref = item.isShared ? `/${userRoleLower}${item.href}` : item.href;
                if (isDemo && item.isShared && item.href !== "/demo" && item.href.startsWith("/")) {
                  finalHref = `/admin/demo${item.href}`;
                }
                const isActive = pathname === finalHref;
                
                return (
                  <SidebarMenuItem key={item.title + item.href}>
                    <SidebarMenuButton 
                      isActive={isActive}
                      tooltip={isCollapsed ? item.title : undefined}
                      className={cn(
                        "h-9 rounded-lg px-3 font-medium text-sm transition-all duration-200",
                        isActive 
                          ? "bg-slate-100 text-slate-900 font-semibold" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      )}
                      render={(props) => (
                        <Link {...props} href={finalHref} className={cn("flex items-center gap-2", props.className)}>
                          <item.icon className={cn("h-3.5 w-3.5", isActive ? "text-slate-900" : "text-slate-400")} />
                          {!isCollapsed && <span>{item.title}</span>}
                        </Link>
                      )}
                    />
                  </SidebarMenuItem>
                );
              })}
            </div>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-50">
        <div className={cn("flex items-center gap-2 mb-3", isCollapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
            {user?.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || "User"}
              </p>
              <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
                {role}
              </p>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          onClick={() => signOut()} 
          size={isCollapsed ? "icon" : "sm"}
          className={cn(
            "w-full text-slate-500 hover:text-red-600 font-semibold text-xs justify-start px-2",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className={cn("h-3.5 w-3.5", !isCollapsed && "mr-2")} />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
