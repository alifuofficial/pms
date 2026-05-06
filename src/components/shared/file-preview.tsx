"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Download, X, Eye } from "lucide-react";

interface FilePreviewProps {
  url: string;
  filename?: string;
  trigger?: React.ReactNode;
}

export function FilePreview({ url, filename, trigger }: FilePreviewProps) {
  const [open, setOpen] = useState(false);
  
  const isPDF = url.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={(trigger as React.ReactElement) || (
          <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100">
            <Eye size={14} />
          </Button>
        )} 
      />
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col">
        <DialogHeader className="p-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileText size={18} />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">Document Preview</DialogTitle>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[300px]">{filename || "Digital Document"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pr-8">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg px-3">
                <ExternalLink size={14} className="mr-2" /> Open Original
              </Button>
            </a>
            <a href={url} download>
              <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg px-3">
                <Download size={14} className="mr-2" /> Download
              </Button>
            </a>
          </div>
        </DialogHeader>
        
        <div className="flex-1 bg-slate-200/50 flex items-center justify-center overflow-hidden">
          {isPDF && (
            <iframe 
              src={`${url}#toolbar=0`} 
              className="w-full h-full border-none"
              title="PDF Preview"
            />
          )}
          {isImage && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img 
                src={url} 
                alt="File Preview" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg bg-white" 
              />
            </div>
          )}
          {!isPDF && !isImage && (
            <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-sm mx-auto">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Preview Not Available</h3>
              <p className="text-xs text-slate-500 mt-2 mb-6">This file type cannot be previewed directly. Please download the file to view it.</p>
              <a href={url} download>
                <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6 h-10 font-bold text-xs">
                  <Download size={14} className="mr-2" /> Download Now
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
