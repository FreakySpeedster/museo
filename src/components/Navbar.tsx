import { getCurrentUser } from "@/lib/auth";
import { AppNav } from "./AppNav";

/** Server wrapper: resolves the signed-in user and hands the client navigation what it needs. */
export async function Navbar() {
  const user = await getCurrentUser();
  return <AppNav user={user ? { username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, subscribed: user.subscribed } : null} />;
}
