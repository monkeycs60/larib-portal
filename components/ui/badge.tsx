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
          "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857] [a&]:hover:bg-[#D1FAE5]",
        warning:
          "border-[#FDBA74] bg-[#FFF3E9] text-[#EA580C] [a&]:hover:bg-[#FFE9D5]",
        danger:
          "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] [a&]:hover:bg-[#FEE2E2]",
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
