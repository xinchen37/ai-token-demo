import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-11 text-sm text-slate-700 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
          className,
        )}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}
