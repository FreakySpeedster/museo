/** Phone top bar height (`h-12` in `AppNav`). On desktop the sidebar is vertical, so nothing sits above the page. */
export const MOBILE_TOPBAR_HEIGHT_PX = 48;
export const STICKY_TOP_CLASS = "top-12 md:top-0";

/** Shrink the observer root by the phone top bar so the header counts as gone once it slips under it. */
export function stickyObserverOptions(isDesktop: boolean): IntersectionObserverInit {
  return { threshold: 0, rootMargin: `-${isDesktop ? 0 : MOBILE_TOPBAR_HEIGHT_PX}px 0px 0px 0px` };
}

/** Compact identity (avatar, name, handle) is shown only after the profile header has left the viewport. */
export function isCompactIdentityShown(headerIsIntersecting: boolean): boolean {
  return !headerIsIntersecting;
}
