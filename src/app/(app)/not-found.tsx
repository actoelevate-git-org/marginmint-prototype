import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-line bg-white">
      <EmptyState
        icon={SearchX}
        title="Not found"
        description="That record does not exist in this workspace."
        action={
          <Link href="/overview" className={buttonVariants({ variant: "secondary" })}>
            Back to overview
          </Link>
        }
      />
    </div>
  );
}
