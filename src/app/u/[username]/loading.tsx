import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading profile">
      <div className="flex items-center gap-5">
        <Skeleton className="size-[88px] !rounded-full" />
        <div className="space-y-3"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-72" /></div>
      </div>
      <Skeleton className="mt-8 h-10 w-72 !rounded-full" />
      <div className="mt-10 space-y-3">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5]" />)}
        </div>
      </div>
    </div>
  );
}
