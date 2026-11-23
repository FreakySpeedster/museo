import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 sm:px-6" aria-busy="true" aria-label="Loading topic">
      <div className="flex items-center gap-4 pb-5 pt-4 md:pt-12">
        <Skeleton className="size-16 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="mt-2 h-7 w-44 rounded-full" />
          <Skeleton className="mt-2 h-4 w-36 rounded-full" />
        </div>
      </div>
      <div className="mb-7 flex gap-2 overflow-hidden">
        {[96, 120, 88, 110].map((w, i) => <Skeleton key={i} className="h-11 shrink-0 rounded-full" style={{ width: w }} />)}
      </div>
      <Skeleton className="mb-3 h-5 w-40 rounded-full" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <Skeleton className="mt-2 h-4 w-3/4 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
