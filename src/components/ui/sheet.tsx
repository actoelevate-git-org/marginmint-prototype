"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/** Left-edge drawer (used for mobile navigation). */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-forest-950 shadow-popover outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left"
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Close
            className="absolute right-3 top-4 rounded-md p-1.5 text-emerald-100/70 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
