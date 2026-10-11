"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-lg border border-line bg-white">
      <EmptyState
        icon={AlertTriangle}
        title="This view could not be loaded"
        description="Something went wrong while calculating these figures. No data was changed. Try again, or pick a different filter."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
