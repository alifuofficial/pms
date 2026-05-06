"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
      <Link 
        href={`/${segments[0]}/dashboard`} 
        className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
      >
        <Home size={12} />
        Dashboard
      </Link>
      
      {segments.slice(1).map((segment, index) => {
        const path = `/${segments.slice(0, index + 2).join("/")}`;
        const isLast = index === segments.length - 2;
        
        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRight size={12} className="text-slate-300" />
            {isLast ? (
              <span className="text-slate-900">{segment.replace("-", " ")}</span>
            ) : (
              <Link href={path} className="hover:text-blue-600 transition-colors">
                {segment.replace("-", " ")}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
