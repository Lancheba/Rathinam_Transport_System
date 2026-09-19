import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. Uses useSyncExternalStore so the value is
 * correct on the very first render (no desktop-layout flash on phones) and
 * stays in sync when the window is resized or the phone is rotated.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/**
 * Below this width the app swaps the sidebar for a bottom tab bar.
 * Keep in sync with the `@media (max-width: 900px)` blocks in responsive.css.
 */
export const MOBILE_QUERY = "(max-width: 900px)";

export const useIsMobile = (): boolean => useMediaQuery(MOBILE_QUERY);
