import { useEffect, useState } from 'react';

// Reference resolution the desktop was designed/tested at. Scale is derived
// from how the actual viewport compares to this.
const REFERENCE_WIDTH = 1440;
const REFERENCE_HEIGHT = 900;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.6;

function computeScale(viewportWidth, viewportHeight) {
  const raw = Math.min(viewportWidth / REFERENCE_WIDTH, viewportHeight / REFERENCE_HEIGHT);
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw));
}

function computeState() {
  if (typeof window === 'undefined') {
    return { scale: 1, viewportWidth: REFERENCE_WIDTH, viewportHeight: REFERENCE_HEIGHT };
  }
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  return { scale: computeScale(viewportWidth, viewportHeight), viewportWidth, viewportHeight };
}

/**
 * Live scale factor + raw viewport size for desktop chrome (menu bar, dock,
 * window titlebars, fonts, spawn positions), recalculated whenever the
 * browser window resizes. Viewport width/height are exposed alongside scale
 * because they can change without scale changing (e.g. width changes while
 * height stays the binding dimension) — anything doing its own layout math
 * off the raw viewport (see useImageWindowLayout) needs to react to that too.
 *
 * Starts at the reference size (matching SSR) and updates after mount to
 * avoid a server/client hydration mismatch — see MenuBar's clock for the
 * same pattern.
 *
 * The Webamp player is deliberately NOT scaled by `scale`: it draws itself
 * from real bitmap sprites, and its drag math reads raw, unscaled mouse
 * deltas, so wrapping it in a CSS `transform: scale()` makes the window
 * visibly outrun the cursor while dragging (confirmed while building this —
 * a 1.15x scale produced ~15% drag drift). It stays at native size; see
 * DESKTOP_CONFIG / Webamp's own `enableDoubleSizeMode` if a clean 2x is
 * wanted later.
 */
export function useDesktopScale() {
  const [state, setState] = useState(() => ({
    scale: 1,
    viewportWidth: REFERENCE_WIDTH,
    viewportHeight: REFERENCE_HEIGHT,
  }));

  useEffect(() => {
    const update = () => setState(computeState());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return state;
}
