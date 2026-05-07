"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface DataImportExportProps {
  type: "TENANTS" | "UNITS";
  onExport: () => Promise<{ success: boolean; csv?: string; error?: string }>;
  onImport: (csv: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export function DataImportExport({ type, onExport, onImport }: DataImportExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await onExport();
      if (result.success && result.csv) {
        // Trigger download
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${type.toLowerCase()}_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`${type} exported successfully.`);
      } else {
        toast.error(result.error || `Failed to export ${type.toLowerCase()}.`);
      }
    } catch (error) {
      toast.error(`An unexpected error occurred during export.`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast.error("Please upload a valid CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvString = event.target?.result as string;
      if (csvString) {
        setIsImporting(true);
        toast.loading(`Importing ${type.toLowerCase()}...`, { id: "import-toast" });
        try {
          const result = await onImport(csvString);
          if (result.success) {
            toast.success(result.message || "Import completed.", { id: "import-toast" });
          } else {
            toast.error(result.error || "Import failed.", { id: "import-toast" });
          }
        } catch (error) {
          toast.error("An unexpected error occurred during import.", { id: "import-toast" });
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read the file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <>
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 text-xs font-semibold" disabled={isExporting || isImporting}>
            {isExporting || isImporting ? (
              <Loader2 size={14} className="mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet size={14} className="mr-2" />
            )}
            Data
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleExport} disabled={isExporting || isImporting}>
            <Download size={14} className="mr-2 text-slate-500" />
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={isExporting || isImporting}>
            <Upload size={14} className="mr-2 text-slate-500" />
            Import from CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
