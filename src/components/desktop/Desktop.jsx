import React, { useEffect, useState } from 'react';
import styles from './Desktop.module.css';
import DESKTOP_CONFIG from '../../config/desktopConfig';
import MenuBar from './MenuBar';
import Dock from './Dock';
import WebampWindow from './WebampWindow';
import ImageWindow from './ImageWindow';
import { useWindowStack } from './useWindowStack';
import { useDesktopScale } from './useDesktopScale';
import { useImageWindowLayout } from './useImageWindowLayout';

const WINDOW_IDS = ['webamp', 'image'];

// Reference (unscaled, at the 1440x900 design resolution) spawn position —
// see useDesktopScale for how this gets multiplied up/down to fit the
// actual screen. Webamp is pinned to the top-left corner (and locked there
// — see WebampWindow).
const WEBAMP_BASE_POSITION = { x: 20, y: 20 };

// Preferred width for the image window — actual size is capped by
// useImageWindowLayout so it can never overlap the menu bar, dock, or
// Webamp. Must match the aspect-ratio in ImageWindow.module.css (2560x1664,
// the source image's real dimensions, so nothing gets cropped).
const IMAGE_BASE_WIDTH = 860;
const IMAGE_ASPECT_RATIO = 20 / 13;

const Desktop = () => {
  const { zIndices, bringToFront } = useWindowStack(WINDOW_IDS);
  const { scale, viewportWidth, viewportHeight } = useDesktopScale();
  const [webampRect, setWebampRect] = useState(null);

  const imageLayout = useImageWindowLayout({
    scale,
    viewportWidth,
    viewportHeight,
    webampRect,
    baseWidth: IMAGE_BASE_WIDTH,
    aspectRatio: IMAGE_ASPECT_RATIO,
  });

  // This page is a single immersive screen — no page scroll while it's mounted.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className={styles.desktopRoot} data-desktop-root style={{ '--ui-scale': scale }}>
      <div
        className={styles.wallpaper}
        style={{ '--wallpaper-image': `url(${DESKTOP_CONFIG.wallpaperSrc})` }}
      />
      <div className={styles.crtOverlay} aria-hidden="true" />

      <MenuBar />

      <WebampWindow
        initialPosition={{ x: WEBAMP_BASE_POSITION.x * scale, y: WEBAMP_BASE_POSITION.y * scale }}
        zIndex={zIndices.webamp}
        onFocus={() => bringToFront('webamp')}
        onLayout={setWebampRect}
      />

      {imageLayout && (
        <ImageWindow
          id="image"
          image={DESKTOP_CONFIG.imageWindow}
          showTitle={false}
          draggable={false}
          initialPosition={{ x: imageLayout.x, y: imageLayout.y }}
          width={imageLayout.width}
          zIndex={zIndices.image}
          onFocus={() => bringToFront('image')}
        />
      )}

      <Dock />
    </div>
  );
};

export default Desktop;
