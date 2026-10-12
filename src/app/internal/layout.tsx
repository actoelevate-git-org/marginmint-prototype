import { ArrowUpRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { InternalMobileNav, InternalSidebar, type NavSection } from "@/components/internal/internal-sidebar";
import { LogoMark } from "@/components/layout/logo";
import { allEntries, SECTIONS } from "@/internal/content";

export const metadata: Metadata = {
  title: { default: "Internal handbook", template: "%s · Internal · MarginMint" },
  robots: { index: false, follow: false },
};

function navSections(): NavSection[] {
  const entries = allEntries();
  return SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    entries: entries.filter((e) => e.section === section.id).map(({ href, title, description }) => ({ href, title, description })),
  }));
}

export default function InternalLayout({ children }: { children: ReactNode }) {
  const sections = navSections();
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-forest-950 text-white">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 lg:px-6">
          <Link href="/internal" className="flex items-center gap-2.5">
            <LogoMark className="size-7" />
            <span className="text-[15px] font-semibold tracking-tight">MarginMint</span>
            <span className="hidden text-sm text-emerald-100/70 sm:inline">Internal handbook</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-300/30 bg-white/5 px-2.5 py-1 text-2xs font-medium text-emerald-100 md:inline-flex">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Internal · not customer-facing
            </span>
            <Link href="/overview" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-emerald-50/90 hover:bg-white/10 hover:text-white">
              Open the app
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] gap-8 px-4 lg:px-6">
        <aside className="scrollbar-thin sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-line py-6 pr-4 lg:block">
          <InternalSidebar sections={sections} />
        </aside>
        <div className="min-w-0 flex-1 py-6 lg:py-10">
          <div className="mb-6 lg:hidden">
            <InternalMobileNav sections={sections} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
