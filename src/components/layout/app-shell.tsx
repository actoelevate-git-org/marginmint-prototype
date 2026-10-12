import { Suspense, type ReactNode } from "react";
import { Logo } from "./logo";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarNav } from "./sidebar-nav";
import { TopBar } from "./top-bar";

export function AppShell({
  children,
  workspaceName,
  lastSyncedLabel,
  today,
  dataStartDay,
}: {
  children: ReactNode;
  workspaceName: string;
  lastSyncedLabel: string;
  today: string;
  dataStartDay: string;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-forest-950 lg:flex print:!hidden">
        <div className="px-5 pb-1 pt-4">
          <Logo />
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <Suspense fallback={null}>
            <SidebarNav />
          </Suspense>
        </div>
        <SidebarFooter />
      </aside>
      <div className="min-w-0 lg:pl-60 print:!pl-0">
        <TopBar workspaceName={workspaceName} lastSyncedLabel={lastSyncedLabel} today={today} dataStartDay={dataStartDay} />
        <main id="main" className="mx-auto max-w-[1440px] px-4 pb-12 pt-5 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
