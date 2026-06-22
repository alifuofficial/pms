"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, ShieldCheck } from "lucide-react";

interface ClearancePrintViewProps {
  request: any;
  settings: any;
}

export function ClearancePrintView({ request, settings }: ClearancePrintViewProps) {
  useEffect(() => {
    // Auto-open print dialog on load
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const tenant = request.tenant;
  const lease = request.lease;
  const unit = lease.unit;
  const property = unit.property;
  const approver = request.approver;

  const todayStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white p-6 print:p-0 flex flex-col items-center">
      {/* Control Bar (Hidden on print) */}
      <div className="no-print w-full max-w-[800px] mb-6 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Button 
          variant="outline" 
          onClick={() => window.close()} 
          className="text-xs flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          <span>Close Window</span>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Ready to print. Press button if print dialog doesn't open.</span>
          <Button 
            onClick={() => window.print()} 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print Certificate</span>
          </Button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="clearance-certificate w-[210mm] min-h-[297mm] bg-white p-[25mm] border border-slate-200 shadow-lg print:border-none print:shadow-none print:p-0 flex flex-col justify-between font-serif text-slate-800 relative">
        {/* Certificate Header */}
        <div className="space-y-6">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
                {settings.organizationName || "Soreti International"}
              </h2>
              {settings.tinNumber && (
                <p className="text-[11px] font-mono text-slate-500 mt-1">TIN: {settings.tinNumber}</p>
              )}
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                {settings.address || "Addis Ababa, Ethiopia"}
              </p>
              <p className="text-xs text-slate-500 font-sans">
                {settings.phone && `Tel: ${settings.phone}`} · {settings.website && settings.website}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-sans text-xs font-semibold mb-2">
                <ShieldCheck size={14} />
                <span>OFFICIALLY CLEARED</span>
              </div>
              <p className="text-xs font-sans text-slate-500">Date: {todayStr}</p>
              <p className="text-xs font-sans font-semibold text-slate-700 mt-1">Ref No: CLR-{request.id.substring(request.id.length - 8).toUpperCase()}</p>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center py-6 space-y-2">
            <h1 className="text-3xl font-extrabold tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-2">
              Lease Clearance Certificate
            </h1>
            <p className="text-sm italic text-slate-500">
              For Completion of Rental Tenancy & Vacancy Clearance
            </p>
          </div>

          {/* Recipient Statement */}
          <div className="text-[15px] leading-relaxed text-justify space-y-6 my-6 font-serif">
            <p>
              This is to formally certify and confirm that the tenancy lease for the designated property unit described below has been successfully terminated and cleared under the authorized rules of the property management office.
            </p>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 bg-slate-50 p-6 rounded-lg border border-slate-100 font-sans text-sm my-6">
              <div>
                <h4 className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-1">Tenant Details</h4>
                <p className="font-bold text-slate-900">{tenant.name || "N/A"}</p>
                <p className="text-xs text-slate-600">{tenant.phoneNumber || "No phone"}</p>
                <p className="text-xs text-slate-600">{tenant.email || "No email"}</p>
              </div>
              <div>
                <h4 className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-1">Property & Unit</h4>
                <p className="font-bold text-slate-900">Unit {unit.unitNumber}</p>
                <p className="text-xs text-slate-600">{property.name}</p>
                <p className="text-xs text-slate-600">{property.address}</p>
              </div>
              <div>
                <h4 className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-1">Lease Dates</h4>
                <p className="text-xs text-slate-800"><span className="font-medium">Started:</span> {new Date(lease.startDate).toLocaleDateString()}</p>
                <p className="text-xs text-slate-800"><span className="font-medium">Contract End:</span> {new Date(lease.endDate).toLocaleDateString()}</p>
              </div>
              <div>
                <h4 className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-1">Vacancy / Move-out</h4>
                <p className="text-xs text-slate-800"><span className="font-medium">Requested Move-out:</span> {new Date(request.requestedMoveOutDate).toLocaleDateString()}</p>
                <p className="text-xs text-slate-800"><span className="font-medium">Clearance Date:</span> {request.clearanceIssuedAt ? new Date(request.clearanceIssuedAt).toLocaleDateString() : todayStr}</p>
              </div>
            </div>

            <p>
              The management hereby declares that a thorough financial and operational audit has been conducted on the lease account. The tenant has fully paid and settled all outstanding rents, utility invoices (inclusive of water and electricity tariffs), and late-payment penalties. 
              {request.shortNoticeFee > 0 && " Furthermore, the short-notice move-out fee has been successfully billed and satisfied."}
            </p>
            <p>
              Accordingly, the tenant is released from any further obligations, liabilities, or claims associated with the lease contract of the aforementioned unit. The unit has been handed over in acceptable condition, keys returned, and is officially marked vacant and available for occupancy.
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-12 pt-12 border-t border-slate-200">
          <div className="grid grid-cols-3 gap-8 font-sans text-xs">
            <div className="text-center space-y-8">
              <div className="h-10"></div>
              <div className="border-t border-slate-400 pt-2 space-y-1">
                <p className="font-bold text-slate-900">{tenant.name || "Tenant"}</p>
                <p className="text-slate-500 uppercase tracking-wider text-[9px]">Tenant Signature</p>
              </div>
            </div>

            <div className="text-center space-y-8">
              <div className="h-10 flex items-end justify-center">
                <span className="text-[10px] font-mono text-slate-300 font-bold tracking-widest uppercase">NexusPMS Official Stamp</span>
              </div>
              <div className="border-t border-slate-400 pt-2 space-y-1">
                <p className="text-slate-500 uppercase tracking-wider text-[9px]">Official Stamp / Seal</p>
              </div>
            </div>

            <div className="text-center space-y-8">
              <div className="h-10 flex items-end justify-center font-bold text-slate-900 text-xs italic">
                {approver?.name || "Authorized Officer"}
              </div>
              <div className="border-t border-slate-400 pt-2 space-y-1">
                <p className="font-bold text-slate-900">{approver?.name || "Management Office"}</p>
                <p className="text-slate-500 uppercase tracking-wider text-[9px]">{approver?.role || "Authorized Officer"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS to inject for print */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .clearance-certificate {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: A4;
            margin: 20mm;
          }
        }
      `}</style>
    </div>
  );
}
