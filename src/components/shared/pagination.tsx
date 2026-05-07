"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <Link href={createPageURL(1)} passHref>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-slate-200"
            disabled={currentPage <= 1}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={createPageURL(currentPage - 1)} passHref>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 rounded-lg border-slate-200"
            disabled={currentPage <= 1}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={createPageURL(currentPage + 1)} passHref>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 rounded-lg border-slate-200"
            disabled={currentPage >= totalPages}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={createPageURL(totalPages)} passHref>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-slate-200"
            disabled={currentPage >= totalPages}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
