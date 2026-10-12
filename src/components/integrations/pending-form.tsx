"use client";

import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Native POST form whose submit button shows a busy state and cannot be
 * double-submitted. Works without JavaScript too (plain form post).
 */
export function PendingForm({
  action,
  label,
  pendingLabel,
  variant = "secondary",
  hidden,
  children,
}: {
  action: string;
  label: string;
  pendingLabel: string;
  variant?: ButtonProps["variant"];
  hidden?: Record<string, string>;
  children?: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form action={action} method="post" onSubmit={() => setPending(true)}>
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <Button type="submit" size="sm" variant={variant} disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {pending ? pendingLabel : label}
      </Button>
    </form>
  );
}
