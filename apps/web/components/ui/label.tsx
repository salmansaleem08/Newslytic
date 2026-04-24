import type { LabelHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Props = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: Props) {
  return <label className={cn("flex select-none items-center gap-2 text-sm font-medium leading-none", className)} {...props} />;
}
