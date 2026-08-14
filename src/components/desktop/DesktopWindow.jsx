import React, { useEffect, useRef } from 'react';
import styles from './DesktopWindow.module.css';
import { useDraggable } from './useDraggable';

const DesktopWindow = ({
  id,
  title,
  showTitle = true,
  draggable = true,
  initialPosition = { x: 0, y: 0 },
  center = false,
  width,
  zIndex,
  onFocus,
  onLayout,
  clamp = true,
  children,
}) => {
  const windowRef = useRef(null);
  const { position, onDragHandleMouseDown } = useDraggable(initialPosition, onFocus, windowRef, {
    center,
    live: !draggable,
    clamp,
  });

  // Reports this window's real rendered rect back up, the same way
  // WebampWindow does — so other windows (see im-famous's corner layout in
  // Desktop.jsx) can position themselves to never overlap it, without
  // hand-tuning reference coordinates that only hold at specific scales.
  useEffect(() => {
    if (!onLayout) return;
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    onLayout({ x: rect.left, y: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom });
  }, [onLayout, position.x, position.y, width]);

  return (
    <div
      ref={windowRef}
      className={styles.window}
      style={{
        left: position.x,
        top: position.y,
        width,
        zIndex,
      }}
      onMouseDown={onFocus}
      role="dialog"
      aria-label={title}
    >
      <div
        className={`${styles.titleBar} ${draggable ? '' : styles.titleBarStatic}`}
        onMouseDown={draggable ? onDragHandleMouseDown : undefined}
      >
        {/* Decorative only — mimics real window chrome, doesn't do anything. */}
        <span className={styles.closeBox} aria-hidden="true" />
        <div className={styles.titleText}>{showTitle ? title : ''}</div>
        <span className={styles.zoomBox} aria-hidden="true" />
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
};

export default DesktopWindow;
