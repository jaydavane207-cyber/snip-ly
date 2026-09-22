"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  leftText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, leftText, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none z-10">
              {leftIcon}
            </div>
          )}
          {leftText && (
            <div className="flex items-center h-full absolute left-0 px-3 border-r border-slate-200 bg-slate-50 rounded-l-xl text-slate-500 text-sm select-none z-10 top-0 bottom-0">
              {leftText}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
              error
                ? "border-red-300 focus:ring-red-400"
                : "border-slate-200",
              leftIcon ? "pl-10 pr-4 py-3" : "px-4 py-3",
              leftText ? "pl-[calc(3rem+1px)] pr-4 py-3" : "",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
