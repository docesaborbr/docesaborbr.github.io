import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Variantes no desenho da loja: cápsula com moldura dourada, marrom, clara ou vazada.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-accent text-center text-sm leading-[1.35] font-normal whitespace-nowrap transition-[opacity,background-color,color] outline-none select-none hover:opacity-85 focus-visible:ring-3 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        claro: "bg-secondary text-secondary-foreground",
        outline: "bg-transparent text-foreground",
        destructive: "border-destructive bg-transparent text-destructive",
        // botões redondos de quantidade: marrom que vira dourado no hover
        quantidade:
          "border-transparent bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground hover:opacity-100",
        ghost: "border-transparent hover:bg-muted hover:opacity-100",
        link: "border-transparent underline underline-offset-4 hover:opacity-70",
      },
      size: {
        default: "h-[43px] px-[22px]",
        sm: "h-[34px] px-3.5 text-[13px]",
        lg: "h-[54px] px-[38px] text-[15.5px]",
        icon: "size-[30px] text-[17px] leading-none",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    // vem depois do tamanho, senão a altura e o recuo do botão venceriam o link
    compoundVariants: [{ variant: "link", class: "h-auto px-0" }],
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
  const Comp = asChild ? Slot.Root : "button"

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
