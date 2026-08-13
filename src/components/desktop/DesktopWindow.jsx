import React, { useRef } from 'react';
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
  children,
}) => {
  const windowRef = useRef(null);
  const { position, onDragHandleMouseDown } = useDraggable(initialPosition, onFocus, windowRef, {
    center,
    live: !draggable,
  });

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
