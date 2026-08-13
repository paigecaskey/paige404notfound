import { useEffect, useRef, useState } from 'react';

/**
 * Tracks whether an <img> failed to load, for showing a text/CSS fallback.
 *
 * A plain `onError` prop misses same-origin 404s here: the request often
 * settles before hydration attaches React's listener, and the browser never
 * replays a missed event. Checking `complete`/`naturalWidth` right after
 * mount catches that already-failed case; a native listener catches
 * failures that happen later.
 */
export function useImageFallback() {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (!img) return undefined;

    if (img.complete && img.naturalWidth === 0) {
      setFailed(true);
      return undefined;
    }

    const handleError = () => setFailed(true);
    img.addEventListener('error', handleError);
    return () => img.removeEventListener('error', handleError);
  }, []);

  return { ref, failed };
}
