import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer hover:cursor-clicker",
  {
    variants: {
      variant: {
        default:
          "text-jade bg-jade/10 hover:bg-jade/20",
        destructive:
          "text-error bg-error/10 hover:bg-error/20",
        outline:
          "border border-input bg-none hover:text-liquirice hover:bg-flash",
        link: "text-flash underline-offset-4 hover:underline",
        purchase: "border border-input bg-none hover:text-liquirice hover:bg-flash/10 hover:text-flash/50",
      },
      size: {
        default: "px-5 py-2",
        sm: "rounded-sm px-3 py-1",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
