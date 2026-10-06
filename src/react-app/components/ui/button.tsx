import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap no-underline transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      // DESIGN.md §3 Button: primary（黒地・白文字）/ secondary（白地・薄い枠）/ outline（白地・黒枠）/ destructive（危険）
      variant: {
        default: "bg-primary text-primary-foreground font-bold hover:bg-primary/85 hover:text-primary-foreground",
        secondary: "border-line-strong bg-surface text-ink font-bold hover:bg-surface-sub hover:text-ink",
        outline: "border-ink bg-surface text-ink font-bold hover:bg-surface-sub hover:text-ink",
        destructive: "border-danger bg-surface text-danger font-bold hover:bg-surface-sub hover:text-danger",
        ghost: "text-ink hover:bg-muted hover:text-ink aria-expanded:bg-muted",
        link: "text-link underline underline-offset-4 hover:text-link-hover",
      },
      // タップ領域は 40px 以上（DESIGN §7）
      size: {
        default: "h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        sm: "h-9 gap-1 px-3 text-[13px]",
        lg: "h-[52px] gap-2 px-7 text-[15px]",
        icon: "size-10",
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
