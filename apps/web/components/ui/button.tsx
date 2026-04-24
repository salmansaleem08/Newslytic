import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type Size = "default" | "sm" | "lg" | "icon";

const variantStyles: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  outline:
    "border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline"
};

const sizeStyles: Record<Size, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 gap-1.5 rounded-md px-3",
  lg: "h-10 px-6",
  icon: "size-9"
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ className, variant = "default", size = "default", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-secondary aria-invalid:ring-secondary/20",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
