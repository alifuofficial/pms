"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function DemoSandboxPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/demo/dashboard");
  }, [router]);

  return (
    <div className="flex h-[400px] flex-col items-center justify-center gap-3">
      <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      <p className="text-xs text-slate-500 font-medium">Entering Demo Sandbox Playground...</p>
    </div>
  );
}
