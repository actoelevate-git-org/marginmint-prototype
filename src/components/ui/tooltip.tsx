"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={150}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            "z-50 max-w-xs rounded-md bg-ink px-3 py-2 text-xs leading-relaxed text-white shadow-popover",
            "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0",
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/** Keyboard-focusable "i" button that explains a financial term. */
export function InfoTooltip({ label, content, className }: { label: string; content: ReactNode; className?: string }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        aria-label={`About ${label}`}
        className={cn("inline-flex size-4 items-center justify-center rounded-full text-slate-400 hover:text-ink", className)}
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
