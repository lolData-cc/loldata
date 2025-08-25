import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  variant?: "default" | "underline";
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    if (variant === "underline") {
      return (
        <div className="relative">
          <input
            ref={ref}
            type={type}
            // aggiungi placeholder=" " se non vuoi un vero placeholder ma vuoi triggerare la pseudo-class
            placeholder=" "
            className={cn(
              "peer relative z-10 block w-full bg-transparent",
              "px-6 py-2 md:text-[13px]",
              "border-0 border-b border-flash/30 rounded-none",
              "placeholder:text-flash/70 text-flash",
              "focus:outline-none focus:ring-0",
              "focus:border-flash/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            {...props}
          />

          {/* underline animata */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-0 right-0 bottom-0 h-[1px]",
              "bg-jade z-20",
              "origin-left scale-x-0",
              "transition-transform duration-300 ease-linear",
              // attiva al focus
              "peer-focus:scale-x-100",
              // e rimane attiva quando non è vuoto
              "peer-[&:not(:placeholder-shown)]:scale-x-100"
            )}
          />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-flash ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-flash/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flash/10 focus-visible:border-flash/10",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "bg-liquirice border-flash/20",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
