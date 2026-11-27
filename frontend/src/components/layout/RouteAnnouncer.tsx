import { useEffect, useRef, useState } from 'react';

/**
 * Client-side navigation doesn't reload the page, so screen readers don't
 * notice it. This announces the new page's title after each navigation.
 */
export function RouteAnnouncer({ title }: { title: string | undefined }) {
  const [announcement, setAnnouncement] = useState('');
  const previous = useRef(title);

  useEffect(() => {
    if (!title || title === previous.current) return;
    previous.current = title;
    // Defer so the update is a change the live region announces, not part of the initial render.
    const id = window.setTimeout(() => setAnnouncement(`${title} page`), 100);
    return () => window.clearTimeout(id);
  }, [title]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}
