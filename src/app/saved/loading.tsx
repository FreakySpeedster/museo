import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 sm:px-6" aria-busy="true" aria-label="Loading saved items">
      <div className="pt-5 md:pt-12">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="mt-2 h-4 w-60 rounded-full" />
      </div>
      <SavedGridSkeleton />
    </div>
  );
}

function SavedGridSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 md:mt-8 md:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <Skeleton className="mt-2 h-4 w-4/5 rounded-full" />
          <Skeleton className="mt-1.5 h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}
