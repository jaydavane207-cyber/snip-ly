import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
}

export function Card({ className, padding = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50",
        padding && "p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
