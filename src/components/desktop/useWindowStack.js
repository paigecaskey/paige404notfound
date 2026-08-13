import { useCallback, useRef, useState } from 'react';

const BASE_Z = 10;

/**
 * Shared focus/z-index stack for every window on the desktop (Mac-chrome
 * windows and the Webamp container alike), so clicking any one of them
 * brings it in front of the others without the two systems fighting.
 */
export function useWindowStack(initialIds) {
  const counterRef = useRef(BASE_Z + initialIds.length);
  const [zIndices, setZIndices] = useState(() => {
    const initial = {};
    initialIds.forEach((id, index) => {
      initial[id] = BASE_Z + index;
    });
    return initial;
  });

  const bringToFront = useCallback((id) => {
    setZIndices((current) => {
      const highest = Math.max(BASE_Z, ...Object.values(current));
      if (current[id] === highest) return current;
      counterRef.current += 1;
      return { ...current, [id]: counterRef.current };
    });
  }, []);

  return { zIndices, bringToFront };
}
