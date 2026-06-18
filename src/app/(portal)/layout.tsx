import { auth } from "@/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <SidebarProvider>
      <SidebarNav role={user.role} user={user} />
      <SidebarInset className="flex flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-white/80 backdrop-blur-md px-4 sticky top-0 z-20">
          <SidebarTrigger className="h-9 w-9" />
          <div className="h-4 w-px bg-slate-200 mx-2" />
          <div className="flex-1" />
        </header>
        <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
