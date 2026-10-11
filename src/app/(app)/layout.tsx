import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentWorkspace } from "@/services/workspace";

export default function AppLayout({ children }: { children: ReactNode }) {
  const workspace = getCurrentWorkspace();
  return (
    <AppShell
      workspaceName={workspace.name}
      lastSyncedLabel={workspace.lastSyncedLabel}
      today={workspace.today}
      dataStartDay={workspace.dataStartDay}
    >
      {children}
    </AppShell>
  );
}
