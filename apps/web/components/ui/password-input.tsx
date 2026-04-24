"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "./button";
import { Input } from "./input";

type Props = React.ComponentProps<typeof Input>;

export function PasswordInput({ className, ...props }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className={cn("pr-10", className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={() => setShow((state) => !state)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
      </Button>
    </div>
  );
}
