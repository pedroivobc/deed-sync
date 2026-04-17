import { Skeleton } from "@/components/ui/skeleton";

/** Generic Suspense fallback used while lazy-loaded routes resolve. */
export function PageLoader() {
  return (
    <div className="flex h-screen w-full">
      <div className="hidden w-64 shrink-0 border-r border-border bg-sidebar p-4 md:block">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64 rounded-2xl" />
      </div>
    </div>
  );
}
