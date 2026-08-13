const MENU_BAR_SELECTOR = '[data-desktop-safe-area="menu-bar"]';
const DOCK_SELECTOR = '[data-desktop-safe-area="dock"]';

/**
 * The rectangle windows are allowed to occupy: below the menu bar, above the
 * dock, full width. Measured live off the actual DOM nodes (rather than
 * derived from the --ui-scale formulas) so it stays correct regardless of
 * how the chrome's CSS changes.
 */
export function getSafeAreaBounds() {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const menuBar = document.querySelector(MENU_BAR_SELECTOR);
  const dock = document.querySelector(DOCK_SELECTOR);
  return {
    top: menuBar ? menuBar.getBoundingClientRect().bottom : 0,
    bottom: dock ? dock.getBoundingClientRect().top : window.innerHeight,
    left: 0,
    right: window.innerWidth,
  };
}

/** Clamps a { x, y, width, height } rect so it stays fully inside `bounds`. */
export function clampRectToSafeArea({ x, y, width, height }, bounds = getSafeAreaBounds()) {
  const maxX = Math.max(bounds.left, bounds.right - width);
  const maxY = Math.max(bounds.top, bounds.bottom - height);
  return {
    x: Math.min(Math.max(x, bounds.left), maxX),
    y: Math.min(Math.max(y, bounds.top), maxY),
  };
}

/** Top-left position that centers a { width, height } box within `bounds`. */
export function getCenteredPosition({ width, height }, bounds = getSafeAreaBounds()) {
  return {
    x: (bounds.left + bounds.right) / 2 - width / 2,
    y: (bounds.top + bounds.bottom) / 2 - height / 2,
  };
}
