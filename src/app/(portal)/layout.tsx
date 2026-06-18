import { auth } from "@/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { redirect } from "next/navigation";
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
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav role={user.role} user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-white/80 backdrop-blur-md px-6 sticky top-0 z-20">
          <div className="flex-1" />
        </header>
        <main className="flex-1 p-4 md:p-8 lg:p-10">
          <div className="max-w-[1400px] mx-auto">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
