import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "slate" | "sky" | "amber" | "rose" | "emerald";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const tones: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700",
  sky: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  emerald: "bg-emerald-50 text-emerald-700",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded px-2 py-1 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
