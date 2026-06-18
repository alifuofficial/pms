"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  const btnBase = "flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors";
  const btnActive = "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 bg-white";
  const btnDisabled = "border-slate-200 text-slate-300 cursor-not-allowed opacity-50 select-none";

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex w-[100px] items-center justify-start text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        {/* First Page */}
        {currentPage <= 1 ? (
          <div className={cn(btnBase, btnDisabled, "hidden lg:flex")}>
            <ChevronsLeft className="h-4 w-4" />
          </div>
        ) : (
          <a
            href={createPageURL(1)}
            className={cn(btnBase, btnActive, "hidden lg:flex")}
          >
            <ChevronsLeft className="h-4 w-4" />
          </a>
        )}

        {/* Previous Page */}
        {currentPage <= 1 ? (
          <div className={cn(btnBase, btnDisabled)}>
            <ChevronLeft className="h-4 w-4" />
          </div>
        ) : (
          <a
            href={createPageURL(currentPage - 1)}
            className={cn(btnBase, btnActive)}
          >
            <ChevronLeft className="h-4 w-4" />
          </a>
        )}

        {/* Next Page */}
        {currentPage >= totalPages ? (
          <div className={cn(btnBase, btnDisabled)}>
            <ChevronRight className="h-4 w-4" />
          </div>
        ) : (
          <a
            href={createPageURL(currentPage + 1)}
            className={cn(btnBase, btnActive)}
          >
            <ChevronRight className="h-4 w-4" />
          </a>
        )}

        {/* Last Page */}
        {currentPage >= totalPages ? (
          <div className={cn(btnBase, btnDisabled, "hidden lg:flex")}>
            <ChevronsRight className="h-4 w-4" />
          </div>
        ) : (
          <a
            href={createPageURL(totalPages)}
            className={cn(btnBase, btnActive, "hidden lg:flex")}
          >
            <ChevronsRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
