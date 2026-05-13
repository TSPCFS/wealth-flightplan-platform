import { useEffect } from 'react';

const SUFFIX = ' — Wealth FlightPlan™';

// Sets `document.title` to `${title}${SUFFIX}` while the calling component is
// mounted, and restores the previous title on unmount. Pass `null` to skip the
// update (useful for pages that compose their title from async-loaded data).
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (title === null) return;
    const previous = document.title;
    document.title = `${title}${SUFFIX}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
