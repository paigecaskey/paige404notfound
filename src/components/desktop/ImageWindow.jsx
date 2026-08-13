import React from 'react';
import DesktopWindow from './DesktopWindow';
import styles from './ImageWindow.module.css';
import { useImageFallback } from './useImageFallback';

const ImageWindow = ({
  id,
  image,
  initialPosition,
  center,
  showTitle = true,
  draggable = true,
  width,
  zIndex,
  onFocus,
}) => {
  const { ref, failed } = useImageFallback();

  return (
    <DesktopWindow
      id={id}
      title={image.title}
      initialPosition={initialPosition}
      center={center}
      showTitle={showTitle}
      draggable={draggable}
      width={width}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div className={styles.frame}>
        <img
          ref={ref}
          className={styles.image}
          src={image.src}
          alt={image.alt}
          draggable={false}
          style={{ display: failed ? 'none' : undefined }}
        />
        {failed && <div className={styles.placeholder}>{image.alt || 'TODO: image'}</div>}
      </div>
    </DesktopWindow>
  );
};

export default ImageWindow;
