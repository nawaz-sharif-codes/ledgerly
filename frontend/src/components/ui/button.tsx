import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-transparent px-button-x py-xs text-button font-medium whitespace-nowrap transition-[background-color,color,border-color,transform] outline-none select-none focus-visible:border-primary-focus focus-visible:ring-2 focus-visible:ring-primary-focus/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 max-sm:min-h-11 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-focus",
        secondary:
          "border-hairline bg-surface-1 text-ink hover:border-hairline-strong hover:bg-surface-2 active:bg-surface-3",
        tertiary:
          "bg-background text-ink hover:bg-surface-1 active:bg-surface-2",
        inverse:
          "bg-inverse-canvas text-inverse-ink hover:bg-ink-muted active:bg-ink-subtle",
        link: "min-h-0 px-0 py-0 text-primary hover:text-primary-hover",
      },
      size: {
        default: "gap-xs",
        sm: "min-h-9 gap-xs text-caption",
        lg: "min-h-11 gap-sm text-body-sm",
        icon: "size-10 min-h-10 px-0 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
