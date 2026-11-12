import { getCurrentUser } from "@/lib/auth";
import { AppNav } from "./AppNav";
import { MarketingNav } from "./MarketingNav";
import { SearchProvider } from "./search/SearchProvider";

/** Public pages get a top bar. The signed-in app keeps the sidebar (and phone bars). */
export async function Shell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div data-shell="marketing">
        <MarketingNav />
        <main>{children}</main>
      </div>
    );
  }
  return (
    <SearchProvider>
      <div className="app-shell" data-shell="app">
        <AppNav
          user={{
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            subscribed: user.subscribed,
          }}
        />
        <main className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[var(--nav-offset)]">{children}</main>
      </div>
    </SearchProvider>
  );
}
