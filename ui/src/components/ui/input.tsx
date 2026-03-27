"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-[14px] font-medium text-white/40">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full bg-[#1C1C1E] rounded-lg px-3 py-2.5 text-[14px] text-white border border-white/5",
            "focus:outline-none focus:border-[#0A84FF]/50 transition-colors placeholder:text-white/20",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
