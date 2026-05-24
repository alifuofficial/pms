"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";
import { Printer, X, ShieldAlert, BadgeInfo, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnitWithProperty {
  id: string;
  unitNumber: string;
  qrSlug: string | null;
  rentAmount: number;
  type: string;
  floor: number | null;
  size: number | null;
  property: {
    name: string;
  };
}

export function BulkPrintClient({ units }: { units: UnitWithProperty[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Split units into chunks of 8 (since we fit 8 per A4 sheet)
  const chunks: UnitWithProperty[][] = [];
  for (let i = 0; i < units.length; i += 8) {
    chunks.push(units.slice(i, i + 8));
  }

  const handlePrint = () => {
    window.print();
  };

  if (units.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No Printable QR Codes</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            There are no units with active QR slugs in this selection. Please generate secure QR slugs first or adjust your filters.
          </p>
          <Button 
            onClick={() => router.back()} 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold h-10 shadow-none"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 pb-20 print:pb-0 print:bg-white animate-in fade-in duration-500">
      
      {/* Sticky Control Bar (Non-Printable) */}
      <div className="no-print sticky top-0 z-50 w-full bg-slate-900 text-white py-3 px-6 shadow-md flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
            QR
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider">A4 Grid Print Preview</h2>
            <p className="text-[10px] text-slate-400 font-bold">
              {units.length} Units • {chunks.length} A4 Sheet{chunks.length > 1 ? "s" : ""} (8 stickers per sheet)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 rounded-lg text-xs shadow-none cursor-pointer flex items-center gap-2"
          >
            <Printer size={14} />
            Print Stickers
          </Button>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-slate-700 hover:bg-slate-800 text-slate-300 font-bold h-9 px-4 rounded-lg text-xs shadow-none cursor-pointer flex items-center gap-2"
          >
            <X size={14} />
            Close
          </Button>
        </div>
      </div>

      {/* Pages Container */}
      <div className="flex flex-col items-center gap-8 py-8 print:py-0 print:gap-0 bg-slate-100/60 print:bg-white min-h-[calc(100vh-60px)] print:min-h-0 justify-center">
        {chunks.map((chunk, chunkIdx) => (
          <div 
            key={chunkIdx} 
            className="a4-sheet w-[210mm] h-[297mm] bg-white p-[10mm] grid grid-cols-2 grid-rows-4 gap-[8mm] shadow-xl rounded-sm print:shadow-none print:rounded-none print:m-0 print:w-[210mm] print:h-[297mm] print:page-break-after-always print:break-after-page relative overflow-hidden"
          >
            {chunk.map((unit) => {
              const slug = unit.qrSlug || "UNRESOLVED";
              return (
                <div 
                  key={unit.id} 
                  className="sticker-badge border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-white flex flex-col justify-between h-[62mm] w-[90mm] relative box-border overflow-hidden group hover:border-slate-400 transition-colors"
                >
                  {/* Sticker Header */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Soreti Portal</p>
                      <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none">
                        Unit {unit.unitNumber}
                      </h3>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider max-w-[130px] truncate">
                        {unit.property.name}
                      </p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-[7px] font-bold text-slate-400 uppercase block">Rent Rate</span>
                      <span className="text-xs font-black text-slate-900">
                        {unit.rentAmount.toLocaleString()} ETB
                      </span>
                      <span className="text-[6px] font-bold text-slate-400 uppercase block leading-none">
                        {unit.type || "Standard"} • {unit.size ? `${unit.size} sqm` : "Studio"}
                      </span>
                    </div>
                  </div>

                  {/* Body: QR & Scan instructions */}
                  <div className="flex items-center gap-4 py-2 border-t border-b border-slate-50">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-center h-[90px] w-[90px]">
                      {mounted && origin && (
                        <QRCode 
                          value={`${origin}/u/${slug}`} 
                          size={74}
                          level="Q"
                        />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle size={10} className="text-slate-800" />
                        <span className="text-[8px] font-black text-slate-900 uppercase tracking-wider">Scan Live QR</span>
                      </div>
                      <p className="text-[7px] text-slate-500 font-medium leading-relaxed">
                        Hold your phone camera over the code to check payment status, verify leases, or contact management.
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[6px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Slug: {slug}</span>
                    <span>PMSsticker V2</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Embedded CSS for Page Break rules */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          .a4-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 10mm 10mm !important;
            page-break-after: always !important;
            break-after: page !important;
            width: 210mm !important;
            height: 297mm !important;
            display: grid !important;
            grid-template-cols: repeat(2, 1fr) !important;
            grid-template-rows: repeat(4, 1fr) !important;
            gap: 8mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .sticker-badge {
            height: 62mm !important;
            width: 90mm !important;
            border-color: #cbd5e1 !important; /* Keep dashes visible */
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </div>
  );
}
