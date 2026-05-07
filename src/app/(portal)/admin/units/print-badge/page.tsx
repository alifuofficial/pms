"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import { QrCode as QrIcon, Building2, ShieldCheck, Zap } from "lucide-react";

export default function PrintBadgePage() {
  const searchParams = useSearchParams();
  const unitNumber = searchParams.get("unitNumber");
  const propertyName = searchParams.get("property");
  const slug = searchParams.get("slug");
  const [mounted, setMounted] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && slug) {
      // Auto-trigger print after a short delay to allow QR to render
      const timer = setTimeout(() => {
        window.print();
      }, 1500); // Increased delay for slower renders
      return () => clearTimeout(timer);
    }
  }, [mounted, slug]);

  if (!slug) return <div className="p-10 text-center">Invalid Request</div>;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8 print:p-0">
      <div className="print-badge w-[400px] border-[12px] border-slate-900 rounded-[3rem] p-10 space-y-10 bg-white shadow-2xl print:border-[8px]">
        
        {/* Branding Header */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                 <Building2 size={16} />
              </div>
              <span className="text-sm font-black tracking-tighter uppercase">Soreti Portal</span>
           </div>
           <ShieldCheck size={20} className="text-slate-300" />
        </div>

        {/* Unit Info */}
        <div className="text-center space-y-2">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Unit Access Node</p>
           <h1 className="text-6xl font-black text-slate-900 tracking-tighter">
             {unitNumber}
           </h1>
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{propertyName}</p>
        </div>

        {/* QR Code Section */}
        <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center gap-6">
           <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 min-h-[234px] flex items-center justify-center">
              {mounted && origin && (
                <QRCode 
                  value={`${origin}/u/${slug}`} 
                  size={200}
                  level="H"
                />
              )}
           </div>
           <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <Zap size={10} className="fill-slate-900" /> Scan for Live Status
              </p>
              <p className="text-[8px] font-bold text-slate-400 uppercase">Check Payments • View Terms • Contact Support</p>
           </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase">Node ID</span>
              <span className="text-[10px] font-bold text-slate-900">{slug}</span>
           </div>
           <div className="text-right">
              <span className="text-[8px] font-black text-slate-400 uppercase">System</span>
              <span className="text-[10px] font-bold text-slate-900">PMS-V2</span>
           </div>
        </div>

        <p className="text-[7px] text-center text-slate-300 font-bold uppercase tracking-widest">
           Soreti International Trading • Official Property Management Node
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 0;
            size: auto;
          }
          .no-print {
            display: none !important;
          }
          .print-badge {
            break-inside: avoid;
            page-break-inside: avoid;
            margin: 0 auto !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
