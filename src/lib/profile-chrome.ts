/** App navbar height (`h-16` in `Navbar`). Sticky profile chrome sits just below it. */
export const APP_NAV_HEIGHT_PX = 64;
export const APP_NAV_TOP_CLASS = "top-16";

/** Shrink the observer root by the navbar so the header counts as gone once it slips under the app bar. */
export const STICKY_OBSERVER_ROOT_MARGIN = `-${APP_NAV_HEIGHT_PX}px 0px 0px 0px`;

export const STICKY_OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0,
  rootMargin: STICKY_OBSERVER_ROOT_MARGIN,
};

/** Compact identity (avatar, name, handle) is shown only after the profile header has left the viewport. */
export function isCompactIdentityShown(headerIsIntersecting: boolean): boolean {
  return !headerIsIntersecting;
}
