import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-[3px] focus-visible:ring-navy-500/40 aria-invalid:border-danger-500 aria-invalid:ring-danger-500/30 transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-navy-600 text-white [a&]:hover:bg-navy-700",
        secondary:
          "border-transparent bg-gray-100 text-gray-700 [a&]:hover:bg-gray-200",
        destructive:
          "border-transparent bg-danger-600 text-white [a&]:hover:bg-danger-700",
        outline:
          "border-line text-gray-700 [a&]:hover:bg-gray-50",
        success:
          "border-success-100 bg-success-50 text-success-700 [a&]:hover:bg-success-100",
        warning:
          "border-warn-100 bg-warn-50 text-warn-700 [a&]:hover:bg-warn-100",
        danger:
          "border-danger-100 bg-danger-50 text-danger-700 [a&]:hover:bg-danger-100",
        neutral:
          "border-gray-200 bg-gray-100 text-gray-600 [a&]:hover:bg-gray-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
