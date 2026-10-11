"use client";

import { Menu } from "lucide-react";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Logo } from "./logo";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Navigation">
        <div className="px-5 pb-1 pt-4">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={null}>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </Suspense>
        </div>
        <SidebarFooter />
      </Sheet>
    </>
  );
}
