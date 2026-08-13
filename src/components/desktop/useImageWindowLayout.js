import { useEffect, useState } from 'react';
import { getSafeAreaBounds } from './safeArea';

const MARGIN = 20;
const MAX_VIEWPORT_WIDTH_FRACTION = 0.9;
const MAX_SAFE_HEIGHT_FRACTION = 0.92;
// Must match DesktopWindow.module.css: .titleBar height (calc(32px * scale))
// plus ~1px border top/bottom. The window's *total* rendered height is this
// plus the image itself, so it has to be budgeted for when deciding how
// tall the window can be without poking out of the safe area.
const CHROME_HEIGHT_BASE = 32;
const CHROME_HEIGHT_EXTRA = 3;

/**
 * Computes a centered rect for the image window that can never overlap the
 * menu bar, the dock, or Webamp's footprint — recalculated whenever the
 * viewport resizes or Webamp's own rect changes.
 *
 * Horizontal centering is always on the full viewport (nothing at the sides
 * constrains it). Vertical centering is within the safe area *below*
 * Webamp — clearing it vertically (below its ~244px-tall footprint) is a far
 * easier constraint to satisfy across viewport sizes than clearing it
 * horizontally would be (it's ~560px wide, wider than half of many
 * reasonable browser widths), so that's the constraint this leans on to
 * guarantee zero overlap. Size is capped to fit that space rather than just
 * clamping position, since a too-tall window would otherwise poke out the
 * top or bottom no matter where it's positioned.
 */
export function useImageWindowLayout({ scale, viewportWidth, viewportHeight, webampRect, baseWidth, aspectRatio }) {
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !viewportWidth || !viewportHeight) return;

    const safe = getSafeAreaBounds();
    const margin = MARGIN * scale;
    const top = webampRect ? Math.max(safe.top, webampRect.bottom + margin) : safe.top;
    const bottom = safe.bottom;
    const safeHeight = Math.max(0, bottom - top);
    const chromeHeight = CHROME_HEIGHT_BASE * scale + CHROME_HEIGHT_EXTRA;

    let width = Math.min(
      baseWidth * scale,
      viewportWidth * MAX_VIEWPORT_WIDTH_FRACTION,
      (safeHeight - chromeHeight) * aspectRatio * MAX_SAFE_HEIGHT_FRACTION
    );
    width = Math.max(width, 160);
    const totalHeight = width / aspectRatio + chromeHeight;

    const x = viewportWidth / 2 - width / 2;
    const y = top + (safeHeight - totalHeight) / 2;

    setLayout({
      x: Math.max(0, Math.min(x, viewportWidth - width)),
      y: Math.max(top, Math.min(y, bottom - totalHeight)),
      width,
    });
  }, [scale, viewportWidth, viewportHeight, webampRect?.bottom, baseWidth, aspectRatio]);

  return layout;
}
