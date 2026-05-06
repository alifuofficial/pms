import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PersonalSettingsForm } from "@/components/shared/personal-settings-form";
import { redirect } from "next/navigation";

export default async function ManagerSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      calendarType: true,
    }
  });

  if (!user) redirect("/auth/login");

  return (
    <div className="max-w-[800px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Personal Settings</h1>
        <p className="text-sm text-slate-500 font-medium">Manage your security preferences and regional display settings.</p>
      </div>

      <PersonalSettingsForm initialData={user} />
    </div>
  );
}
