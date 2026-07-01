import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-text-primary placeholder:text-gray-600 selection:bg-navy-600 selection:text-white border-line flex h-9 w-full min-w-0 rounded-md border bg-gray-25 px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-navy-500 focus-visible:ring-navy-500/30 focus-visible:ring-[3px]",
        "aria-invalid:ring-danger-500/30 aria-invalid:border-danger-500",
        className
      )}
      {...props}
    />
  )
}

export { Input }
