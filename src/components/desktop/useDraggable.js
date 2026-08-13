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
 */
export function useDraggable(initialPosition, onDragStart, elementRef, { center = false, live = false } = {}) {
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
    setPosition(clampRectToSafeArea({ ...target, width: rect.width, height: rect.height }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live) return;
    setPosition({ x: initialPosition.x, y: initialPosition.y });
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
