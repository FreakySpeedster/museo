import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { Skeleton } from "./Skeleton";

/** Route-level loading states, shaped like the page they stand in for so nothing jumps when it arrives. */
function Header({ eyebrow }: { eyebrow?: boolean }) {
  return (
    <div className="mb-6 pt-5 md:mb-8 md:pt-12">
      {eyebrow && <Skeleton className="mb-2 h-4 w-28 rounded-full" />}
      <Skeleton className="h-9 w-48 rounded-xl" />
    </div>
  );
}

const Shell = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
  <div className={`mx-auto px-4 pb-10 sm:px-6 ${wide ? "max-w-5xl" : "max-w-2xl"}`} role="status" aria-label="Loading">
    {children}
  </div>
);

export function FeedPageSkeleton() {
  return (
    <Shell>
      <Header eyebrow />
      <Skeleton className="mb-4 h-12 w-full rounded-xl" />
      <FeedSkeleton />
    </Shell>
  );
}

export function ListPageSkeleton({ rows = 6, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <Shell>
      <Header />
      <div className="space-y-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            {avatar && <Skeleton className="size-11 shrink-0 rounded-full" />}
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-full" />
              <Skeleton className="h-3 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function BlogPageSkeleton() {
  return (
    <Shell wide>
      <Header />
      <Skeleton className="mb-6 h-12 w-full rounded-xl" />
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <Skeleton className="h-5 w-4/5 rounded-full" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function SearchPageSkeleton() {
  return (
    <Shell>
      <div className="pt-5 md:pt-12">
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="mt-4 h-12 w-full rounded-xl" />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="aspect-square w-full rounded-none" />)}
      </div>
    </Shell>
  );
}

export function ItemPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl md:px-6 md:pt-10" role="status" aria-label="Loading">
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_22rem] md:gap-8">
        <Skeleton className="aspect-square w-full rounded-none md:rounded-2xl" />
        <div className="space-y-3 px-4 pt-4 md:px-0">
          <div className="flex gap-4"><Skeleton className="size-7 rounded-full" /><Skeleton className="size-7 rounded-full" /><Skeleton className="size-7 rounded-full" /></div>
          <Skeleton className="h-6 w-3/4 rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <Shell>
      <Header />
      <div className="space-y-7">
        {[1, 1, 1, 2].map((n, i) => (
          <div key={i}>
            <Skeleton className="mb-2 ml-4 h-3 w-20 rounded-full" />
            <Skeleton className={`w-full rounded-2xl ${n === 2 ? "h-28" : "h-14"}`} />
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-6 md:pt-12" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-4/5 rounded-xl" />
      <div className="mt-4 flex items-center gap-3"><Skeleton className="size-8 rounded-full" /><Skeleton className="h-4 w-32 rounded-full" /></div>
      <Skeleton className="mt-6 aspect-[16/9] w-full rounded-2xl" />
      <div className="mt-6 space-y-3">{[1, 0.9, 1, 0.7].map((w, i) => <Skeleton key={i} className="h-4 rounded-full" style={{ width: `${w * 100}%` }} />)}</div>
    </div>
  );
}
