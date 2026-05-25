"use client";

import { Button } from "@/components/ui/button";
import { FileDown, Printer, Eye, EyeOff, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PdfDownloadButtonProps {
  searchParams?: {
    propertyId?: string;
    status?: string;
    type?: string;
    floor?: string;
    q?: string;
  };
}

export function PdfDownloadButton({ searchParams }: PdfDownloadButtonProps) {
  const getUrl = (qrPrinted?: boolean) => {
    const params = new URLSearchParams();
    if (searchParams?.propertyId) params.set("propertyId", searchParams.propertyId);
    if (searchParams?.status) params.set("status", searchParams.status);
    if (searchParams?.type) params.set("type", searchParams.type);
    if (searchParams?.floor !== undefined && searchParams.floor !== "") params.set("floor", String(searchParams.floor));
    if (searchParams?.q) params.set("q", searchParams.q);
    
    if (qrPrinted !== undefined) {
      params.set("qrPrinted", String(qrPrinted));
    }
    params.set("autoPrint", "true");
    return `/admin/units/print-all?${params.toString()}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 text-xs font-semibold flex items-center gap-2 bg-white shadow-none hover:bg-slate-50 text-slate-700 cursor-pointer">
          <FileDown size={14} className="text-slate-500" />
          Download PDF
          <ChevronDown size={12} className="text-slate-400" />
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-100 rounded-xl shadow-xl p-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
        <DropdownMenuItem 
          onClick={() => window.open(getUrl(), "_blank")}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
        >
          <Printer size={13} className="text-slate-400" />
          Download PDF: All QRs
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => window.open(getUrl(false), "_blank")}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
        >
          <EyeOff size={13} className="text-amber-500" />
          Download PDF: Non-Printed QRs
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => window.open(getUrl(true), "_blank")}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
        >
          <Eye size={13} className="text-emerald-500" />
          Download PDF: Printed QRs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
