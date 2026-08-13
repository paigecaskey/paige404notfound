import React from 'react';
import styles from './Dock.module.css';
import DESKTOP_CONFIG from '../../config/desktopConfig';
import { useImageFallback } from './useImageFallback';

const DockIcon = ({ item }) => {
  const { ref, failed } = useImageFallback();

  return (
    <a
      className={styles.icon}
      href={item.href || '#'}
      onClick={item.onClick} // TODO: wire real destinations in desktopConfig.js
      title={item.label}
    >
      <span className={styles.iconArt}>
        <img
          ref={ref}
          src={item.icon}
          alt=""
          draggable={false}
          style={{ display: failed ? 'none' : undefined }}
        />
        {failed && <span className={styles.iconFallback}>{item.label.slice(0, 1)}</span>}
      </span>
      <span className={styles.iconLabel}>{item.label}</span>
    </a>
  );
};

const Dock = () => {
  return (
    <div className={styles.dock} data-desktop-safe-area="dock">
      {DESKTOP_CONFIG.dockIcons.map((item) => (
        <DockIcon key={item.id} item={item} />
      ))}
    </div>
  );
};

export default Dock;
