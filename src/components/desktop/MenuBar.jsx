import React, { useEffect, useState } from 'react';
import styles from './MenuBar.module.css';

function formatMacDateTime(date) {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${weekday}, ${month} ${day}  ${hours}:${minutes} ${ampm}`;
}

const MenuBar = () => {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.menuBar} data-desktop-safe-area="menu-bar">
      <div className={styles.left}>
        <span className={styles.brand}>paige</span>
      </div>
      <div className={styles.right}>
        <span className={styles.clock}>{now ? formatMacDateTime(now) : ' '}</span>
      </div>
    </div>
  );
};

export default MenuBar;
