import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 20000;

function sameSong(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.artist === b.artist &&
    a.title === b.title &&
    a.isPlaying === b.isPlaying &&
    a.albumImageUrl === b.albumImageUrl
  );
}

/**
 * Polls our /api/spotify route (the same one NowPlaying.jsx uses) for the
 * currently playing track. Returns `null` while loading/erroring/nothing
 * playing, or `{ artist, title, durationMs, isPlaying, albumImageUrl }`
 * when there's a track — callers should treat `null` as "show nothing"
 * rather than an error state, since offline/no-credentials/nothing-playing
 * all collapse to the same thing from a UI perspective.
 *
 * Dedupes against the previous value (same reference back if nothing
 * meaningfully changed) so consumers that key effects off this don't get
 * re-triggered every single poll — just when the track actually changes.
 */
export function useNowPlaying() {
  const [song, setSong] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch('/api/spotify');
        if (cancelled) return;
        if (!response.ok || response.status === 204) {
          setSong((prev) => (prev === null ? prev : null));
          return;
        }
        const data = await response.json();
        if (cancelled) return;
        const next = {
          artist: data.artist,
          title: data.title,
          durationMs: data.durationMs,
          isPlaying: data.isPlaying,
          albumImageUrl: data.albumImageUrl,
        };
        setSong((prev) => (sameSong(prev, next) ? prev : next));
      } catch {
        if (!cancelled) setSong((prev) => (prev === null ? prev : null));
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return song;
}
