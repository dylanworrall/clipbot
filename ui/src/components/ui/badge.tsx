import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-[#0A84FF] text-white",
        secondary: "bg-surface-1 text-foreground/70 border-border",
        destructive: "bg-[#FF453A]/10 text-[#FF453A]",
        outline: "border-border text-foreground/70",
        ghost: "text-muted-foreground hover:text-white",
        link: "text-[#0A84FF] underline-offset-4 [a&]:hover:underline",
        blue: "bg-[#0A84FF]/10 text-[#0A84FF]",
        gold: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
        green: "bg-[#30D158]/10 text-[#30D158]",
        red: "bg-[#FF453A]/10 text-[#FF453A]",
        primary: "bg-[#0A84FF]/10 text-[#0A84FF]",
        danger: "bg-[#FF453A]/10 text-[#FF453A]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
