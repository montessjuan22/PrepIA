import * as React from "react";
import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-xl border border-gray-300 dark:border-slate-700",
        "bg-white dark:bg-slate-900/90 px-3.5 py-2 text-base md:text-sm",
        "text-gray-900 dark:text-slate-100 font-medium",
        "placeholder:text-gray-400 dark:placeholder:text-slate-500",
        "shadow-xs transition-colors",
        "outline-none focus-visible:border-[#0066CC] focus-visible:ring-2 focus-visible:ring-[#0066CC]/20 dark:focus-visible:border-blue-500 dark:focus-visible:ring-blue-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
