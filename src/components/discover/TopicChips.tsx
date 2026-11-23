import clsx from "clsx";
import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

/** A scrollable row of topic links (each opens /topics/[slug]). */
export function TopicChips({ topics, className, active }: { topics: Array<{ slug: string; label: string }>; className?: string; active?: string }) {
  if (topics.length === 0) return null;
  return (
    <nav aria-label="Topics" className={clsx("-mx-4 sm:-mx-6", className)}>
      <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 sm:px-6" style={{ scrollbarWidth: "none" }}>
        {topics.map((t) => (
          <li key={t.slug} className="shrink-0">
            <Link
              href={`/topics/${t.slug}`}
              aria-current={active === t.slug ? "page" : undefined}
              data-testid={`topic-${t.slug}`}
              className={clsx(
                "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-meta font-medium transition-colors",
                active === t.slug ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-surface-hover",
              )}
            >
              <CategoryIcon category={t.slug} className="size-4" />
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
