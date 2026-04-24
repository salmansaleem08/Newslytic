import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: "success" | "destructive";
  title: string;
  description?: string;
};

export function Alert({ className, variant = "destructive", title, description }: Props) {
  const isSuccess = variant === "success";
  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border p-3 text-sm",
        isSuccess ? "border-primary/35 bg-primary/10 text-foreground" : "border-destructive/35 bg-destructive/10 text-destructive",
        className
      )}
    >
      {isSuccess ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> : <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />}
      <div>
        <p className="font-medium">{title}</p>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
