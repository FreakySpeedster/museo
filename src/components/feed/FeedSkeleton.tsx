import { Skeleton } from "@/components/ui/Skeleton";

/** Feed card placeholders: header row, photo, title, actions. Shared by the feed and the home route's loading state. */
export function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading feed">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center gap-3 px-4 pb-3 pt-4">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
          </div>
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-2 p-4"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /></div>
        </div>
      ))}
    </div>
  );
}
