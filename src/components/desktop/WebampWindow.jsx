import React, { useEffect, useRef, useState } from 'react';
import styles from './WebampWindow.module.css';
import DESKTOP_CONFIG from '../../config/desktopConfig';
import { clampRectToSafeArea } from './safeArea';
import { useNowPlaying } from './useNowPlaying';
import { getSilentAudioDataUri } from './silentAudio';

// Webamp redux window id -> the DOM id of its rendered root node, and where
// it lives relative to `initialPosition` when open.
const LOCKED_WINDOWS = {
  main: { domId: 'main-window', offset: { x: 0, y: 0 } },
  equalizer: { domId: 'equalizer-window', offset: { x: 0, y: 232 } },
  playlist: { domId: 'playlist-window', offset: { x: 0, y: 464 } },
};

/**
 * Mounts a real Webamp instance loaded with our own .wsz skin (see
 * DESKTOP_CONFIG.webampSkinUrl — change the skin by editing that one path).
 *
 * Uses `renderWhenReady`, not `renderInto`: `renderInto` nests Webamp's real
 * UI *inside* the given node and uses that node itself as the bounding box
 * for its windows, so sizing it to the player's own footprint (the natural
 * thing to do for a "container") clamps all dragging to roughly that tiny
 * box. `renderWhenReady` instead appends Webamp's real UI to <body> — the
 * node it's given only seeds where Webamp starts out, not where it's
 * confined to.
 *
 * Webamp draws its own window chrome from the skin and handles dragging
 * itself, so this component does NOT wrap it in our DesktopWindow chrome or
 * drag hook — that would double up chrome and fight Webamp's own drag logic.
 * It only participates in the desktop's shared focus/z-index stack (see
 * onFocus below), applied directly to Webamp's real root node once it exists,
 * since that's a plain DOM node living outside our React tree.
 *
 * It's rendered at 2x (`enableDoubleSizeMode`) rather than scaled up with
 * CSS: Webamp's drag math reads raw, unscaled mouse deltas, so a CSS
 * `transform: scale()` wrapper makes the window visibly outrun the cursor
 * while dragging (confirmed while building this). Double-size mode is
 * Webamp's own native mechanism, so its drag math already accounts for it.
 *
 * Webamp has no public "disable dragging" option, so it's locked in place by
 * watching its redux store (via its own semi-public change-subscription
 * API) and snapping any window (main/eq/playlist) straight back to its
 * fixed home position the instant a drag moves it — same mechanism used
 * elsewhere to keep it out of the menu bar/dock, just with the target being
 * a fixed point instead of a clamped range.
 *
 * `initialPosition` changes on every browser resize (it scales with the
 * rest of the desktop), so the lock target has to track that live, not just
 * at mount — otherwise resizing the window taller/shorter could leave
 * Webamp's clamped-at-mount-time position sitting in the (now differently
 * sized) menu bar. `onLayout` reports Webamp's current rect back up so
 * other windows (the image window) can lay out around it.
 *
 * Also doubles as a "now playing" display for Spotify (see useNowPlaying):
 * Spotify's API only exposes metadata for whatever's currently playing, not
 * a streamable audio file (that's DRM'd), so the currently-playing
 * artist/title get loaded into Webamp's track display backed by a silent
 * placeholder file that's immediately paused — Webamp shows what you're
 * listening to, it just isn't the one actually producing the sound.
 */
const WebampWindow = ({ initialPosition, zIndex, onFocus, onLayout }) => {
  const anchorRef = useRef(null);
  const webampRef = useRef(null);
  const webampElRef = useRef(null);
  const positionRef = useRef(initialPosition);
  const relockRef = useRef(null);
  const [ready, setReady] = useState(false);
  const song = useNowPlaying();

  useEffect(() => {
    positionRef.current = initialPosition;
    relockRef.current?.();
  }, [initialPosition.x, initialPosition.y]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { default: Webamp } = await import('webamp');

      if (!Webamp.browserIsSupported() || cancelled || !anchorRef.current) return;

      // Webamp's WindowPosition shape is { left, top } (not { x, y }) —
      // passing the wrong keys silently no-ops and Webamp falls back to
      // auto-centering instead of erroring.
      const toWindowPosition = ({ x, y }) => ({ left: x, top: y });
      const homeTarget = (offset) => ({
        x: positionRef.current.x + offset.x,
        y: positionRef.current.y + offset.y,
      });

      const webamp = new Webamp({
        initialTracks: DESKTOP_CONFIG.webampInitialTracks,
        initialSkin: {
          url: DESKTOP_CONFIG.webampSkinUrl,
        },
        enableDoubleSizeMode: true,
        // Keep the footprint to just the main window on load; the equalizer
        // and playlist are still reachable from Webamp's own options menu.
        windowLayout: {
          main: { position: toWindowPosition(homeTarget(LOCKED_WINDOWS.main.offset)) },
          equalizer: {
            position: toWindowPosition(homeTarget(LOCKED_WINDOWS.equalizer.offset)),
            closed: true,
          },
          playlist: {
            position: toWindowPosition(homeTarget(LOCKED_WINDOWS.playlist.offset)),
            closed: true,
          },
        },
      });

      if (cancelled) {
        webamp.dispose();
        return;
      }

      webampRef.current = webamp;
      await webamp.renderWhenReady(anchorRef.current);
      if (cancelled) return;

      // Locks each window's position to its home spot (clamped into the
      // safe area once we can measure its real rendered size). windowLayout
      // above gets this roughly right, but its placement drifts once
      // enableDoubleSizeMode is involved (empirically off by ~half the size
      // delta — 137px/58px for a 275x116 -> 550x232 main window), so this
      // dispatch is what actually pins the exact final position.
      const lockPosition = (windowId) => {
        const { domId, offset } = LOCKED_WINDOWS[windowId];
        const raw = homeTarget(offset);
        const el = document.getElementById(domId);
        const rect = el?.getBoundingClientRect();
        return rect ? clampRectToSafeArea({ ...raw, width: rect.width, height: rect.height }) : raw;
      };

      // Reports using the position we just told it to go to, not a fresh
      // getBoundingClientRect() — Webamp's own React root hasn't
      // necessarily repainted with the new position yet right after a
      // dispatch (dispatch doesn't force a synchronous re-render), so
      // measuring position at that point can read a stale pre-dispatch
      // value. Width/height are safe to measure since those don't depend
      // on the dispatch.
      const reportMainLayout = (position) => {
        const size = document.getElementById('main-window')?.getBoundingClientRect();
        if (!size) return;
        onLayout?.({
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
          bottom: position.y + size.height,
          right: position.x + size.width,
        });
      };

      const relock = () => {
        const mainPosition = lockPosition('main');
        webamp.store.dispatch({
          type: 'UPDATE_WINDOW_POSITIONS',
          positions: {
            main: mainPosition,
            equalizer: lockPosition('equalizer'),
            playlist: lockPosition('playlist'),
          },
          absolute: true,
        });
        reportMainLayout(mainPosition);
      };

      relockRef.current = relock;
      relock();
      setReady(true);

      const webampEl = document.getElementById('webamp');
      webampElRef.current = webampEl;
      if (webampEl) {
        // renderWhenReady always appends #webamp to <body>, a sibling of our
        // React tree, not a descendant of it. Since .desktopRoot's
        // position:fixed makes it a stacking context of its own, a z-index
        // on #webamp out here can never interleave with z-indexes assigned
        // to windows *inside* that tree (like the image window) — #webamp
        // would just always render above or below the whole tree as a unit,
        // regardless of focus order. Moving it inside .desktopRoot (a plain
        // DOM reparent — React isn't tracking this node, so this doesn't
        // disturb its own rendering) puts it in the same stacking context
        // so z-index actually works the same way it does for our own windows.
        document.querySelector('[data-desktop-root]')?.appendChild(webampEl);
        webampEl.style.zIndex = String(zIndex);
        webampEl.addEventListener('mousedown', onFocus, { capture: true });
      }

      const unsubscribe = webamp.__onStateChange(() => {
        const state = webamp.store.getState();
        for (const windowId of Object.keys(LOCKED_WINDOWS)) {
          const win = state.windows.genWindows[windowId];
          if (!win?.open) continue;
          const home = lockPosition(windowId);
          if (home.x !== win.position.x || home.y !== win.position.y) {
            webamp.store.dispatch({
              type: 'UPDATE_WINDOW_POSITIONS',
              positions: { [windowId]: home },
              absolute: true,
            });
            if (windowId === 'main') reportMainLayout(home);
          }
        }
      });

      webampRef.current._unsubscribeLock = unsubscribe;
    })();

    return () => {
      cancelled = true;
      relockRef.current = null;
      if (webampElRef.current) {
        webampElRef.current.removeEventListener('mousedown', onFocus, { capture: true });
      }
      webampRef.current?._unsubscribeLock?.();
      webampRef.current?.dispose();
      webampRef.current = null;
    };
    // Intentionally runs once: `onFocus` always calls bringToFront('webamp'),
    // so the closure captured on mount stays correct for the component's
    // whole lifetime and doesn't need to be re-subscribed on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Webamp's real UI lives outside our React tree (appended to <body>), so
  // z-index changes from the shared focus stack have to be applied
  // imperatively to that node rather than through props/render.
  useEffect(() => {
    if (webampElRef.current) {
      webampElRef.current.style.zIndex = String(zIndex);
    }
  }, [zIndex]);

  // Push the currently-playing Spotify track into Webamp's display whenever
  // it changes. setTracksToPlay auto-starts playback, which we don't want
  // (there's no real audio behind the placeholder file), so it's paused
  // again immediately after.
  useEffect(() => {
    const webamp = webampRef.current;
    if (!ready || !webamp) return;
    if (song) {
      webamp.setTracksToPlay([
        {
          metaData: { artist: song.artist, title: song.title },
          url: getSilentAudioDataUri(),
          duration: song.durationMs ? song.durationMs / 1000 : undefined,
        },
      ]);
      webamp.pause();
    } else {
      webamp.setTracksToPlay([]);
    }
  }, [ready, song]);

  return (
    <div
      ref={anchorRef}
      className={styles.anchor}
      style={{ left: initialPosition.x, top: initialPosition.y }}
    />
  );
};

export default WebampWindow;
