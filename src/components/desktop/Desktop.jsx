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
import { useScatteredImagesLayout } from './useScatteredImagesLayout';

// 'image' (the BSOD window) is listed last so it starts with the highest
// z-index — it's meant to stay the main focus of the page. The scattered
// images (see useScatteredImagesLayout) never need to overlap it at all, so
// this is purely about which window reads as "in front" if focus order ever
// puts two of them at the same z-index.
const WINDOW_IDS = ['webamp', ...DESKTOP_CONFIG.scatteredImages.map((img) => img.id), 'image'];

// Reference (unscaled, at the 1440x900 design resolution) spawn position —
// see useDesktopScale for how this gets multiplied up/down to fit the
// actual screen. Webamp is pinned to the top-left corner (and locked there
// — see WebampWindow).
const WEBAMP_BASE_POSITION = { x: 20, y: 20 };

// Preferred width for the image window — actual size is capped by
// useImageWindowLayout so it can never overlap the menu bar, dock, or
// Webamp.
const IMAGE_BASE_WIDTH = 860;

const Desktop = () => {
  const { zIndices, bringToFront } = useWindowStack(WINDOW_IDS);
  const { scale, viewportWidth, viewportHeight } = useDesktopScale();
  const [webampRect, setWebampRect] = useState(null);
  const [imageRect, setImageRect] = useState(null);

  const imageLayout = useImageWindowLayout({
    scale,
    viewportWidth,
    viewportHeight,
    webampRect,
    baseWidth: IMAGE_BASE_WIDTH,
    aspectRatio: DESKTOP_CONFIG.imageWindow.aspectRatio,
  });

  const scatteredLayouts = useScatteredImagesLayout({
    scale,
    viewportWidth,
    viewportHeight,
    webampRect,
    blockerRect: imageRect,
    images: DESKTOP_CONFIG.scatteredImages,
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

      {DESKTOP_CONFIG.scatteredImages
        .filter((img) => scatteredLayouts[img.id])
        .map((img) => (
          <ImageWindow
            key={img.id}
            id={img.id}
            image={img}
            showTitle={false}
            draggable={false}
            pixelated
            initialPosition={{ x: scatteredLayouts[img.id].x, y: scatteredLayouts[img.id].y }}
            width={scatteredLayouts[img.id].width}
            zIndex={zIndices[img.id]}
            onFocus={() => bringToFront(img.id)}
            clamp={false}
          />
        ))}

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
          onLayout={setImageRect}
        />
      )}

      <Dock />
    </div>
  );
};

export default Desktop;
