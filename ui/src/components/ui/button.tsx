import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#0A84FF] text-white hover:bg-blue-500 shadow-sm",
        destructive: "bg-[#FF453A] text-white hover:bg-[#FF453A]/80 shadow-sm",
        outline: "border border-border bg-surface-1 text-foreground hover:bg-surface-2 shadow-sm",
        secondary: "bg-surface-1 text-foreground border border-border hover:bg-surface-2 shadow-sm",
        ghost: "text-muted-foreground hover:bg-white/10 hover:text-white",
        link: "text-[#0A84FF] underline-offset-4 hover:underline",
        primary: "bg-[#0A84FF] text-white hover:bg-blue-500 shadow-sm",
        danger: "bg-[#FF453A] text-white hover:bg-[#FF453A]/80 shadow-sm shadow-[#FF453A]/20",
        blue: "bg-[#0A84FF] text-white hover:bg-blue-500 shadow-sm",
        gold: "bg-[#FF9F0A] text-white hover:bg-[#FF9F0A]/80 shadow-sm",
        green: "bg-[#30D158] text-white hover:bg-[#30D158]/80 shadow-sm",
        red: "bg-[#FF453A] text-white hover:bg-[#FF453A]/80 shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
