import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#1155ff] text-white hover:bg-[#0648f4]",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
};

export function Button({ className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
