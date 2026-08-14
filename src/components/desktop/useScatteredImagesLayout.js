import { useEffect, useState } from 'react';

const CHROME_HEIGHT_BASE = 32;
const CHROME_HEIGHT_EXTRA = 3;
const MIN_WIDTH = 65;
// Lower floor used only for `neverHide` images as a last resort — see the
// grid-scan fallback below.
const MIN_WIDTH_GUARANTEED = 26;
const ATTEMPTS_PER_SIZE = 60;
const SIZE_STEPS = [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.22];
const GRID_SCAN_STEP = 12;
// How much of a *scattered image's* own area is allowed to be covered by
// another scattered image before a candidate spot is rejected — small
// enough that nothing reads as hidden behind its neighbor, large enough
// that corners can genuinely touch/overlap "a few pixels" the way loose
// desktop clutter actually looks. Never applies to the hard obstacles
// (Webamp, BSOD, the dock) — those are zero-tolerance.
const MAX_OVERLAP_FRACTION = 0.18;

// Deterministic per-image PRNG (mulberry32) — a real Math.random() would
// reshuffle every window on every re-render (any resize, any unrelated
// state change upstream), which reads as flicker rather than "scattered."
// Seeding off the id gives each image a fixed sequence of candidate spots
// that stays put across renders but differs image to image.
function makeRng(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (Math.imul(h, 31) + seedStr.charCodeAt(i)) | 0;
  let a = h >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rectArea(r) {
  return Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
}

function overlapArea(a, b) {
  const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return w * h;
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// Exhaustive fallback for `neverHide` images: pure random sampling can miss
// a valid spot purely by bad luck when the free area is a thin, fragmented
// sliver (common on a narrow phone, where Webamp + BSOD + the dock leave
// almost nothing) — a systematic scan is slower but *will* find one if it
// exists, which is the whole point of guaranteeing this image never drops.
function gridScanForSpot(bounds, width, height, obstacles, placedRects) {
  for (let y = bounds.top; y <= bounds.bottom - height; y += GRID_SCAN_STEP) {
    for (let x = bounds.left; x <= bounds.right - width; x += GRID_SCAN_STEP) {
      const rect = { left: x, top: y, right: x + width, bottom: y + height };
      if (isValidSpot(rect, bounds, obstacles, placedRects)) {
        return { x, y, rect };
      }
    }
  }
  return null;
}

function isValidSpot(rect, bounds, obstacles, placedRects) {
  if (rect.left < bounds.left || rect.top < bounds.top || rect.right > bounds.right || rect.bottom > bounds.bottom) {
    return false;
  }
  for (const obstacle of obstacles) {
    if (rectsOverlap(rect, obstacle)) return false;
  }
  for (const placed of placedRects) {
    const overlap = overlapArea(rect, placed);
    if (overlap === 0) continue;
    const smallerArea = Math.min(rectArea(rect), rectArea(placed));
    if (overlap > smallerArea * MAX_OVERLAP_FRACTION) return false;
  }
  return true;
}

/**
 * Scatters every image at a genuinely random (but stable, per-id-seeded)
 * position across the *entire* free area — full width below the menu bar,
 * down to near the true bottom edge — rejecting any candidate that touches
 * Webamp, BSOD, or the dock (measured live off their real rects, the same
 * onLayout pattern WebampWindow already uses to keep BSOD off of itself),
 * or that overlaps another already-placed image by more than a sliver.
 * Images too big to fit anywhere shrink through a few size steps before
 * giving up and simply not rendering.
 *
 * This replaced an earlier shelf/grid packer. That approach filled one
 * region of free space completely before ever trying the next, so on a
 * wide viewport — where the region beside Webamp alone is huge — every
 * image piled into that one spot instead of spreading across the rest of
 * the screen; and even with a jitter pass on top, positions still landed on
 * a small number of aligned rows, which reads as a grid, not a desktop with
 * windows scattered across it. Sampling truly random candidate positions
 * against the real obstacles avoids both: there's no "first region" to fill
 * to begin with, and nothing about the result is grid-aligned.
 *
 * An image can opt in to `neverHide: true` (see im-famous in
 * desktopConfig.js) to guarantee it always renders somewhere: it's placed
 * first (so it gets first pick of space, before anything else has claimed
 * any — and since size steps are tried largest-first, that means the
 * biggest size that fits anywhere, not whatever's left over after
 * everything else), allowed to shrink further than everything else before
 * giving up, and backed by an exhaustive grid scan if random sampling
 * doesn't turn up a spot.
 */
export function useScatteredImagesLayout({ scale, viewportWidth, viewportHeight, webampRect, blockerRect, images, margin = 16 }) {
  const [layouts, setLayouts] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined' || !viewportWidth || !viewportHeight || !webampRect || !blockerRect) return;

    const menuBar = document.querySelector('[data-desktop-safe-area="menu-bar"]');
    const dockEl = document.querySelector('[data-desktop-safe-area="dock"]');
    const top = menuBar ? menuBar.getBoundingClientRect().bottom : 0;
    const dockRect = dockEl ? dockEl.getBoundingClientRect() : null;

    const m = margin * scale;
    const chromeHeight = CHROME_HEIGHT_BASE * scale + CHROME_HEIGHT_EXTRA;
    const bounds = { left: 0, top, right: viewportWidth, bottom: viewportHeight };

    const pad = (r, padding) => ({ left: r.left - padding, top: r.top - padding, right: r.right + padding, bottom: r.bottom + padding });
    const rawRects = [
      { left: webampRect.x, top: webampRect.y, right: webampRect.right, bottom: webampRect.bottom },
      { left: blockerRect.x, top: blockerRect.y, right: blockerRect.right, bottom: blockerRect.bottom },
    ];
    if (dockRect) rawRects.push({ left: dockRect.left, top: dockRect.top, right: dockRect.right, bottom: dockRect.bottom });
    const obstacles = rawRects.map((r) => pad(r, m));
    // A tighter clearance used only for the neverHide last-resort scan
    // below: on the narrowest phones, BSOD and the dock can each claim
    // 90%+ of the width, leaving only thin horizontal bands free — and the
    // standard margin alone can eat enough of a band's height to push a
    // spot that would otherwise fit below the minimum. Still never zero
    // (no visual touching), just tighter than the margin every other image
    // gets, since this image doesn't have to share the room with anyone —
    // it's placed before anything else claims space.
    const tightObstacles = rawRects.map((r) => pad(r, Math.min(m, 5)));

    const placedRects = [];
    const placements = {};

    for (const img of images) {
      const rng = makeRng(img.id);
      const minWidth = img.neverHide ? MIN_WIDTH_GUARANTEED : MIN_WIDTH;
      let found = null;

      for (const sizeStep of SIZE_STEPS) {
        const width = img.baseWidth * scale * sizeStep;
        if (width < minWidth) break;
        const height = width / img.aspectRatio + chromeHeight;
        if (height > bounds.bottom - bounds.top) continue;

        for (let attempt = 0; attempt < ATTEMPTS_PER_SIZE; attempt++) {
          const x = bounds.left + rng() * Math.max(0, bounds.right - bounds.left - width);
          const y = bounds.top + rng() * Math.max(0, bounds.bottom - bounds.top - height);
          const rect = { left: x, top: y, right: x + width, bottom: y + height };
          if (isValidSpot(rect, bounds, obstacles, placedRects)) {
            found = { x, y, width, rect };
            break;
          }
        }

        // Random sampling can miss a real spot by bad luck when the free
        // area left for this size is a thin sliver — only worth the extra
        // cost for the image that's never allowed to just disappear.
        if (!found && img.neverHide) {
          const scanned = gridScanForSpot(bounds, width, height, obstacles, placedRects);
          if (scanned) found = { x: scanned.x, y: scanned.y, width, rect: scanned.rect };
        }

        if (found) break;
      }

      // SIZE_STEPS bottoms out at 0.22 of baseWidth, which for most images
      // never actually reaches MIN_WIDTH_GUARANTEED (that floor exists
      // specifically for cases smaller than any real fraction of this
      // image's preferred size) — try the exact floor width directly, with
      // the tighter clearance, before finally giving up.
      if (!found && img.neverHide) {
        const width = minWidth;
        const height = width / img.aspectRatio + chromeHeight;
        if (height <= bounds.bottom - bounds.top) {
          const scanned = gridScanForSpot(bounds, width, height, tightObstacles, placedRects);
          if (scanned) found = { x: scanned.x, y: scanned.y, width, rect: scanned.rect };
        }
      }

      if (found) {
        placements[img.id] = { x: found.x, y: found.y, width: found.width };
        placedRects.push(found.rect);
      }
    }

    setLayouts(placements);
  }, [
    scale,
    viewportWidth,
    viewportHeight,
    webampRect?.x,
    webampRect?.y,
    webampRect?.right,
    webampRect?.bottom,
    blockerRect?.x,
    blockerRect?.y,
    blockerRect?.right,
    blockerRect?.bottom,
    images,
    margin,
  ]);

  return layouts;
}
