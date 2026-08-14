import { useCallback, useEffect, useRef, useState } from 'react';
import { clampRectToSafeArea, getCenteredPosition } from './safeArea';

/**
 * Vanilla-JS drag: tracks a window's top/left as state, seeded from
 * `initialPosition` (or centered in the safe area if `center` is set),
 * clamped so it can never be dragged into the menu bar or dock. `elementRef`
 * is measured live each move so clamping accounts for the window's actual
 * current size, not just a value passed in at mount.
 *
 * `live: true` keeps position synced to `initialPosition` on every change,
 * not just at mount — for windows the user can't drag (`draggable={false}`
 * on DesktopWindow), there's no user-driven position to protect from being
 * overwritten, and a parent recomputing layout on resize (see
 * useImageWindowLayout) needs that to actually take effect.
 *
 * `clamp: false` skips clampRectToSafeArea entirely — for windows whose
 * position was already computed against the *real* obstacles (see
 * useScatteredImagesLayout), including a precise, non-full-width dock
 * footprint. clampRectToSafeArea treats the whole row below the dock's top
 * edge as off-limits regardless of x-position, which is deliberately more
 * conservative than that (it doesn't know the dock is a narrow centered
 * pill, not a full-width bar) — applying it on top would silently yank a
 * correctly-placed window back above the dock's row and into whatever
 * already-placed window happens to be there, reintroducing the exact
 * overlap the packer exists to prevent.
 */
export function useDraggable(initialPosition, onDragStart, elementRef, { center = false, live = false, clamp = true } = {}) {
  // Unclamped/uncentered on first paint — the safe area can't be measured
  // yet (nothing's mounted, and during SSR there's no DOM at all), and
  // centering or clamping against a not-yet-available bounds would corrupt
  // the position instead of leaving it alone. The effect below applies the
  // real placement once mounted.
  const [position, setPosition] = useState(initialPosition);
  const dragState = useRef(null);

  useEffect(() => {
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Centers on the full screen, not the safe area between the menu bar and
    // dock — centering on that leftover space sits noticeably higher than
    // true screen-center since the dock eats more of the bottom than the
    // menu bar eats off the top. clampRectToSafeArea below is still applied
    // as a safety net for windows tall enough that true centering would
    // otherwise dip into a bar.
    const viewportBounds = { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
    const target = center
      ? getCenteredPosition({ width: rect.width, height: rect.height }, viewportBounds)
      : { x: initialPosition.x, y: initialPosition.y };
    setPosition(clamp ? clampRectToSafeArea({ ...target, width: rect.width, height: rect.height }) : target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live) return;
    // Clamped the same way the mount effect above is — without this, a
    // non-draggable window whose *reference* position was simply scaled up
    // (not independently safe-area-aware, like useImageWindowLayout's
    // output is) can end up positioned fully off-screen on a smaller
    // viewport, since nothing else here ever corrects it back on-screen.
    //
    // This used to read a stale (pre-update) size here — not a timing
    // fluke, .window had a leftover `transition: width` (from the zoom
    // button, back when it still actually resized the window) that
    // animated width changes over 160ms, so a measurement taken shortly
    // after a width change would catch it mid-transition. Removed in
    // DesktopWindow.module.css; the zoom button is decorative now, so
    // nothing needs it.
    const rect = elementRef.current?.getBoundingClientRect();
    const target = { x: initialPosition.x, y: initialPosition.y };
    setPosition(rect && clamp ? clampRectToSafeArea({ ...target, width: rect.width, height: rect.height }) : target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, initialPosition.x, initialPosition.y]);

  const onMouseMove = useCallback(
    (event) => {
      const drag = dragState.current;
      if (!drag) return;
      const rect = elementRef.current?.getBoundingClientRect();
      const clamped = clampRectToSafeArea({
        x: drag.originX + (event.clientX - drag.startX),
        y: drag.originY + (event.clientY - drag.startY),
        width: rect?.width ?? 0,
        height: rect?.height ?? 0,
      });
      setPosition(clamped);
    },
    [elementRef]
  );

  const onMouseUp = useCallback(() => {
    dragState.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const onDragHandleMouseDown = useCallback(
    (event) => {
      onDragStart?.();
      dragState.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: position.x,
        originY: position.y,
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [position, onDragStart, onMouseMove, onMouseUp]
  );

  return { position, onDragHandleMouseDown };
}
