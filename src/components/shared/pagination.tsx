"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex w-[100px] items-center justify-start text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        {/* First Page */}
        {currentPage <= 1 ? (
          <div className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed opacity-50 select-none">
            <ChevronsLeft className="h-4 w-4" />
          </div>
        ) : (
          <Link
            href={createPageURL(1)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "hidden lg:flex h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Link>
        )}

        {/* Previous Page */}
        {currentPage <= 1 ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed opacity-50 select-none">
            <ChevronLeft className="h-4 w-4" />
          </div>
        ) : (
          <Link
            href={createPageURL(currentPage - 1)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}

        {/* Next Page */}
        {currentPage >= totalPages ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed opacity-50 select-none">
            <ChevronRight className="h-4 w-4" />
          </div>
        ) : (
          <Link
            href={createPageURL(currentPage + 1)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}

        {/* Last Page */}
        {currentPage >= totalPages ? (
          <div className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed opacity-50 select-none">
            <ChevronsRight className="h-4 w-4" />
          </div>
        ) : (
          <Link
            href={createPageURL(totalPages)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "hidden lg:flex h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <ChevronsRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
