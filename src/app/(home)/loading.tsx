import { FeedPageSkeleton } from "@/components/ui/RouteSkeletons";

/** Instant skeleton when tapping Home: the feed renders on the server, so without this the tap waits on the whole payload. */
export default function Loading() {
  return <FeedPageSkeleton />;
}
