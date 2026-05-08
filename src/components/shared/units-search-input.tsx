"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function UnitsSearchInput({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue || "");
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = (q: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          navigate(e.target.value);
        }}
        placeholder="Unit # or Property..."
        className="pl-9 pr-8 h-9 w-64 bg-white border-slate-200 rounded-lg text-sm"
      />
      {value && (
        <button
          onClick={() => { setValue(""); navigate(""); }}
          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
