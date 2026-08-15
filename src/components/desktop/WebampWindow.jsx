import React, { useEffect, useRef, useState } from 'react';
import styles from './WebampWindow.module.css';
import DESKTOP_CONFIG from '../../config/desktopConfig';
import { clampRectToSafeArea } from './safeArea';
import { useNowPlaying } from './useNowPlaying';
import { getSilentAudioDataUri } from './silentAudio';

// Rebuilds the marquee track's content and, if the text is wider than the
// visible box, sets up the seamless two-copy scroll (see .marqueeTrack in
// WebampWindow.module.css) — left static and untruncated otherwise, since
// most "Title — Artist" strings fit without needing to move at all.
function setMarqueeText(trackEl, boxWidth, text, marqueeScrollAnimationName) {
  trackEl.style.animation = 'none';
  trackEl.replaceChildren();

  const single = document.createElement('span');
  single.textContent = text;
  trackEl.appendChild(single);

  const textWidth = single.getBoundingClientRect().width;
  if (textWidth <= boxWidth) return;

  // A second [gap][text] copy, identical to the first — the track's total
  // width is exactly 2x (textWidth + gap), so animating to translateX(-50%)
  // scrolls precisely one copy out of view and lands on a frame that looks
  // identical to the start.
  const makeGap = () => {
    const gap = document.createElement('span');
    gap.style.display = 'inline-block';
    gap.style.width = `${MARQUEE_GAP_PX}px`;
    return gap;
  };
  trackEl.appendChild(makeGap());
  const copy = document.createElement('span');
  copy.textContent = text;
  trackEl.appendChild(copy);
  trackEl.appendChild(makeGap());

  const cycleWidth = textWidth + MARQUEE_GAP_PX;
  const duration = cycleWidth / MARQUEE_SPEED_PX_PER_SEC;
  trackEl.style.animation = `${marqueeScrollAnimationName} ${duration}s linear infinite`;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Webamp redux window id -> the DOM id of its rendered root node, and where
// it lives relative to `initialPosition` when open.
const LOCKED_WINDOWS = {
  main: { domId: 'main-window', offset: { x: 0, y: 0 } },
  equalizer: { domId: 'equalizer-window', offset: { x: 0, y: 232 } },
  playlist: { domId: 'playlist-window', offset: { x: 0, y: 464 } },
};

// The skin's main.bmp bakes a blank dark panel into its background art (no
// visualizer canvas actually renders there unless toggled on) — empirically
// measured off a screenshot of the rendered #main-window at
// enableDoubleSizeMode's 562x244 (left with a couple px of margin inside the
// panel's true edges), then halved: enableDoubleSizeMode applies a CSS
// `transform: scale(2)` directly on #main-window itself (confirmed via
// getComputedStyle), and our overlay — a plain child of that element —
// inherits that same scale. Values measured directly off the already-2x
// screenshot would otherwise get doubled a second time.
const ALBUM_ART_RECT = { left: 19, top: 24, width: 83.5, height: 38.5 };

// The skin's title bar bakes "WWW.DIGITERACTIVE.COM" directly into its
// bitmap art (confirmed: #title-bar has no text content of its own, it's
// pure background image) — there's no dynamic title text to just set, so
// this covers it with a same-style overlay instead, same technique as
// ALBUM_ART_RECT/MARQUEE_OVERLAY_RECT. The original text's rect and
// background color were empirically measured by scanning the rendered
// title bar pixel-by-pixel for the text's dark-navy glyph color against
// its cream background (rather than eyeballed), then halved out of the 2x
// screenshot like the other rects above. Widened well past that original
// span, out toward (but not touching) the option icon on the left
// (native x 6-15) and the minimize icon on the right (starts at native
// x 244) — a flat-color patch sized tightly to the old text read as an
// obviously pasted-on box against the title bar's gradient; extending it
// further into that same gradient on both sides reads as more of an
// intentional panel.
const TITLE_OVERLAY_RECT = { left: 25, top: 3, width: 210, height: 10 };
const TITLE_OVERLAY_BACKGROUND = '#eae6dc';
const TITLE_OVERLAY_TEXT_COLOR = '#0a2f58';
const TITLE_TEXT = "PAIGE'S MUSIC";

// The marquee's bitmap font glyphs are ~5x6px natively — legible enough on
// a 1998 CRT, but not on a modern display, and not fixable by scaling: a
// blocky 5x6px glyph just becomes a bigger blocky glyph (tried this first —
// it also overflowed past the window's right edge, since scaling the
// marquee element scales its whole rendered box, including past its
// original footprint). Real text has actual hinting/antialiasing even at
// small sizes, so instead the native marquee is hidden and a plain HTML
// overlay — same technique as ALBUM_ART_RECT above — sits in its place,
// same footprint, well within the window's bounds.
const MARQUEE_OVERLAY_RECT = { left: 111, top: 24, width: 154, height: 12 };
// Gap between the two looping copies of the text, and how fast the track
// scrolls — tuned for the 8px monospace font below to read comfortably
// rather than blur past.
const MARQUEE_GAP_PX = 24;
const MARQUEE_SPEED_PX_PER_SEC = 32;

// Shown in place of real now-playing data whenever Spotify has nothing
// currently playing (paused, stopped, or before anything's ever played —
// the API collapses all three to the same response, so there's no way to
// tell them apart or show what was last playing instead).
const OFFLINE_ALBUM_ART_SRC = '/assets/webamp/disc.gif';
const OFFLINE_TEXT = 'offline :)';

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
 * listening to, it just isn't the one actually producing the sound. When
 * nothing's playing (paused, stopped, or nothing's ever played — Spotify's
 * API collapses all three to the same response), shows disc.gif and
 * "offline :)" instead — see OFFLINE_ALBUM_ART_SRC/OFFLINE_TEXT.
 *
 * Webamp never renders album art anywhere in its own UI (it stores
 * `metaData.albumArtUrl` but nothing reads it — confirmed by grepping the
 * bundle), so album art is a plain <img> we create and position ourselves,
 * directly over the blank panel described by ALBUM_ART_RECT above. The
 * artist/title marquee gets the same treatment for readability — see
 * MARQUEE_OVERLAY_RECT.
 */
const WebampWindow = ({ initialPosition, zIndex, onFocus, onLayout }) => {
  const anchorRef = useRef(null);
  const webampRef = useRef(null);
  const webampElRef = useRef(null);
  const albumArtElRef = useRef(null);
  const marqueeOverlayElRef = useRef(null);
  const marqueeTrackElRef = useRef(null);
  const titleOverlayElRef = useRef(null);
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

      // #main-window is already position:absolute (confirmed empirically),
      // so a plain absolutely-positioned child lines up against it directly
      // — no extra positioning wrapper needed.
      const mainWindowEl = document.getElementById('main-window');
      if (mainWindowEl) {
        const art = document.createElement('img');
        art.alt = '';
        art.style.position = 'absolute';
        art.style.left = `${ALBUM_ART_RECT.left}px`;
        art.style.top = `${ALBUM_ART_RECT.top}px`;
        art.style.width = `${ALBUM_ART_RECT.width}px`;
        art.style.height = `${ALBUM_ART_RECT.height}px`;
        // 'contain', not 'cover': real album art is square and fine either
        // way, but disc.gif (the offline placeholder, see OFFLINE_ALBUM_ART_SRC)
        // is a small square icon that 'cover' would crop into an off-center
        // sliver to fill this wide rect.
        art.style.objectFit = 'contain';
        art.style.pointerEvents = 'none';
        art.style.display = 'none';
        mainWindowEl.appendChild(art);
        albumArtElRef.current = art;

        // Covers the skin's baked-in "WWW.DIGITERACTIVE.COM" title bar
        // graphic — static, set once, never updated per-song like the art/
        // marquee above.
        const titleOverlay = document.createElement('div');
        titleOverlay.style.position = 'absolute';
        titleOverlay.style.left = `${TITLE_OVERLAY_RECT.left}px`;
        titleOverlay.style.top = `${TITLE_OVERLAY_RECT.top}px`;
        titleOverlay.style.width = `${TITLE_OVERLAY_RECT.width}px`;
        titleOverlay.style.height = `${TITLE_OVERLAY_RECT.height}px`;
        titleOverlay.style.display = 'flex';
        titleOverlay.style.alignItems = 'center';
        titleOverlay.style.justifyContent = 'center';
        titleOverlay.style.overflow = 'hidden';
        titleOverlay.style.background = TITLE_OVERLAY_BACKGROUND;
        titleOverlay.style.color = TITLE_OVERLAY_TEXT_COLOR;
        titleOverlay.style.fontFamily = 'monospace';
        titleOverlay.style.fontWeight = 'bold';
        titleOverlay.style.fontSize = '9px';
        titleOverlay.style.letterSpacing = '0.5px';
        titleOverlay.style.whiteSpace = 'nowrap';
        titleOverlay.style.pointerEvents = 'none';
        titleOverlay.textContent = TITLE_TEXT;
        mainWindowEl.appendChild(titleOverlay);
        titleOverlayElRef.current = titleOverlay;
      }

      const marqueeEl = document.getElementById('marquee');
      if (marqueeEl) {
        marqueeEl.style.visibility = 'hidden';
      }
      if (mainWindowEl) {
        // Outer viewport: fixed size, clips whatever the inner track does.
        const label = document.createElement('div');
        label.style.position = 'absolute';
        label.style.left = `${MARQUEE_OVERLAY_RECT.left}px`;
        label.style.top = `${MARQUEE_OVERLAY_RECT.top}px`;
        label.style.width = `${MARQUEE_OVERLAY_RECT.width}px`;
        label.style.height = `${MARQUEE_OVERLAY_RECT.height}px`;
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.overflow = 'hidden';
        label.style.fontFamily = 'monospace';
        label.style.fontSize = '8px';
        label.style.lineHeight = '1';
        label.style.color = '#dce8f7';
        label.style.textShadow = '0 0 2px rgba(147, 197, 253, 0.8)';
        label.style.background = 'rgba(2, 20, 40, 0.55)';
        label.style.pointerEvents = 'none';

        // Inner track: holds the text (and, once it's known to overflow,
        // a second looping copy — see setMarqueeText) and is what actually
        // gets animated/scrolled.
        const track = document.createElement('div');
        track.className = styles.marqueeTrack;
        label.appendChild(track);

        mainWindowEl.appendChild(label);
        marqueeOverlayElRef.current = label;
        marqueeTrackElRef.current = track;
      }

      // Corrects a track's duration once Webamp finishes "measuring" our
      // silent placeholder's real (tiny) length, which otherwise clobbers
      // whatever duration we hand it at load time — see the `duration`
      // effect below for where this gets armed.
      let pendingDuration = null;

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

        if (pendingDuration) {
          const track = state.tracks[pendingDuration.id];
          if (track?.mediaTagsRequestStatus === 'COMPLETE' && track.duration !== pendingDuration.duration) {
            webamp.store.dispatch({
              type: 'SET_MEDIA_DURATION',
              id: pendingDuration.id,
              duration: pendingDuration.duration,
            });
            pendingDuration = null;
          }
        }
      });

      webampRef.current._unsubscribeLock = unsubscribe;
      webampRef.current._armDurationFix = (id, duration) => {
        pendingDuration = { id, duration };
      };
      webampRef.current._clearDurationFix = () => {
        pendingDuration = null;
      };
    })();

    return () => {
      cancelled = true;
      relockRef.current = null;
      if (webampElRef.current) {
        webampElRef.current.removeEventListener('mousedown', onFocus, { capture: true });
      }
      albumArtElRef.current?.remove();
      albumArtElRef.current = null;
      titleOverlayElRef.current?.remove();
      titleOverlayElRef.current = null;
      marqueeOverlayElRef.current?.remove();
      marqueeOverlayElRef.current = null;
      marqueeTrackElRef.current = null;
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
  // again immediately after. When nothing's playing, shows disc.gif and
  // "offline :)" instead of just going blank.
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

      if (song.durationMs) {
        const id = Object.keys(webamp.store.getState().tracks).pop();
        webamp._armDurationFix?.(Number(id), song.durationMs / 1000);
      } else {
        webamp._clearDurationFix?.();
      }

      if (albumArtElRef.current) {
        albumArtElRef.current.src = song.albumImageUrl || OFFLINE_ALBUM_ART_SRC;
        albumArtElRef.current.style.display = 'block';
      }

      if (marqueeOverlayElRef.current && marqueeTrackElRef.current) {
        const duration = song.durationMs ? ` (${formatDuration(song.durationMs)})` : '';
        setMarqueeText(
          marqueeTrackElRef.current,
          marqueeOverlayElRef.current.clientWidth,
          `${song.title} — ${song.artist}${duration}`,
          styles.marqueeScroll
        );
      }
    } else {
      webamp.setTracksToPlay([]);
      webamp._clearDurationFix?.();
      if (albumArtElRef.current) {
        albumArtElRef.current.src = OFFLINE_ALBUM_ART_SRC;
        albumArtElRef.current.style.display = 'block';
      }
      if (marqueeOverlayElRef.current && marqueeTrackElRef.current) {
        setMarqueeText(marqueeTrackElRef.current, marqueeOverlayElRef.current.clientWidth, OFFLINE_TEXT, styles.marqueeScroll);
      }
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
