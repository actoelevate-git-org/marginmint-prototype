import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-lg border border-line bg-white p-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-3 h-6 w-32" />
            <Skeleton className="mt-3 h-8 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Skeleton className="h-[360px] xl:col-span-3" />
        <Skeleton className="h-[360px] xl:col-span-2" />
      </div>
    </div>
  );
}
