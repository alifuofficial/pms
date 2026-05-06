import { FileText } from "lucide-react";

export default function LeasesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-700">
      <div className="p-6 bg-slate-100 rounded-[2.5rem] text-slate-400">
        <FileText size={64} strokeWidth={1} />
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Leases</h1>
        <p className="text-slate-500 font-medium max-w-xs">Access your digital lease agreements. Generating documents...</p>
      </div>
    </div>
  );
}
