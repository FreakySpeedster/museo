/** App phone top bar height (`h-12` in `AppNav`). Marketing pages use a 64px top bar on every breakpoint. */
export const MOBILE_TOPBAR_HEIGHT_PX = 48;
export const MARKETING_TOPBAR_HEIGHT_PX = 64;
export const STICKY_TOP_CLASS = "top-[var(--chrome-top)]";

export type ShellKind = "app" | "marketing";

export function chromeTopPx(shell: ShellKind, isDesktop: boolean): number {
  if (shell === "marketing") return MARKETING_TOPBAR_HEIGHT_PX;
  return isDesktop ? 0 : MOBILE_TOPBAR_HEIGHT_PX;
}

/** Shrink the observer root by the chrome sitting above the sticky bar. */
export function stickyObserverOptions(isDesktop: boolean, shell: ShellKind = "app"): IntersectionObserverInit {
  return { threshold: 0, rootMargin: `-${chromeTopPx(shell, isDesktop)}px 0px 0px 0px` };
}

/** Compact identity (avatar, name, handle) is shown only after the profile header has left the viewport. */
export function isCompactIdentityShown(headerIsIntersecting: boolean): boolean {
  return !headerIsIntersecting;
}
