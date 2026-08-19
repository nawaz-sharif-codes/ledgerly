import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full min-w-0 rounded-md border border-hairline bg-surface-1 px-sm py-xs text-body text-ink transition-[border-color,box-shadow,background-color] outline-none placeholder:text-ink-tertiary focus-visible:border-primary-focus focus-visible:ring-2 focus-visible:ring-primary-focus/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-tertiary",
        className
      )}
      {...props}
    />
  )
}

export { Input }
