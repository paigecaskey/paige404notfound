/**
 * Single source of truth for every asset the desktop homepage needs.
 * Swap a path here (or drop a new file in `public/assets/...`) and the
 * whole page picks it up — nothing else needs to change.
 *
 * Everything except `webampSkin` is a placeholder path. The files don't
 * exist yet; each component has a graceful fallback so the layout still
 * reads correctly until the real asset lands.
 */

// TODO: drop the real wallpaper at public/assets/wallpaper/wallpaper.jpg
const WALLPAPER_SRC = '/assets/wallpaper/wallpaper.jpg';

// TODO: license + drop Neuropol at public/fonts/neuropol.woff2 (+ .woff fallback if you have it)
const FONT = {
  family: 'Neuropol',
  woff2Src: '/fonts/neuropol.woff2',
  woffSrc: '/fonts/neuropol.woff',
};

// Real asset — already dropped in by the user.
const WEBAMP_SKIN_URL = '/assets/skins/Digiteractive_metallic_blue.wsz';

// TODO: swap in real starter tracks (or leave empty and let visitors drag/drop their own)
const WEBAMP_INITIAL_TRACKS = [
  // { metaData: { artist: 'TODO', title: 'TODO' }, url: '/assets/audio/track-1.mp3', duration: 180 },
];

// Real asset — already dropped in by the user.
const IMAGE_WINDOW = {
  title: 'Windows_9X_BSOD.png',
  src: '/assets/images/bsod.png',
  alt: 'Windows 9X blue screen of death',
  aspectRatio: 20 / 13,
};

// Real assets — a batch of early-2000s web ephemera, scattered at random
// (but stable) positions across whatever screen space is actually left over
// (see useScatteredImagesLayout — everywhere that isn't Webamp, BSOD, or
// the dock) rather than through hand-scaled reference coordinates, which
// had no reason to still make visual sense once the aspect ratio changed
// enough (a laptop window vs. a phone). `baseWidth` is each one's preferred
// width at scale 1 — it shrinks to fit, or drops from render entirely if
// nothing clears a sane minimum anywhere. Order here is placement priority:
// earlier entries get first pick of space. im-famous goes first and is
// marked `neverHide` — it's the biggest of the batch and the one thing on
// this page that's never allowed to disappear, so it always claims a spot
// (shrinking if it truly has to) before anything else gets placed.
// `aspectRatio` is each image's own native width/height so its window isn't
// stretched. Add/remove entries freely — Desktop.jsx just maps over this.
const SCATTERED_IMAGES = [
  {
    id: 'im-famous',
    title: 'im-famous.gif',
    src: '/assets/scattered/im-famous.gif',
    alt: "I'm famous",
    aspectRatio: 600 / 824,
    baseWidth: 380,
    neverHide: true,
  },
  {
    id: 'turntables',
    title: 'turntables.gif',
    src: '/assets/scattered/turntables.gif',
    alt: 'DJ turntables and mixer',
    aspectRatio: 494 / 102,
    baseWidth: 320,
  },
  {
    id: 'pink-floyd',
    title: 'pink-floyd.png',
    src: '/assets/scattered/pink-floyd.png',
    alt: 'I wonder... does God listen to Pink Floyd?',
    aspectRatio: 114 / 112,
    baseWidth: 210,
  },
  {
    id: 'barcode',
    title: 'barcode.gif',
    src: '/assets/scattered/barcode.gif',
    alt: 'Barcode',
    aspectRatio: 136 / 97,
    baseWidth: 200,
  },
  {
    id: 'processing',
    title: 'processing.gif',
    src: '/assets/scattered/processing.gif',
    alt: 'Processing... attempting to give a damn',
    aspectRatio: 100 / 100,
    baseWidth: 160,
  },
  {
    id: 'dj-girl',
    title: 'dj-girl.jpg',
    src: '/assets/scattered/dj-girl.jpg',
    alt: "The DJ's girl",
    aspectRatio: 150 / 150,
    baseWidth: 190,
  },
  {
    id: 'cd',
    title: 'cd.gif',
    src: '/assets/scattered/cd.gif',
    alt: 'Spinning CD',
    aspectRatio: 60 / 60,
    baseWidth: 140,
  },
];

// TODO: drop real icon art in public/assets/icons/, then wire each item's
// destination (href for a normal link, or onClick for custom behavior).
// Add/remove entries freely — the Dock just maps over this array.
const DOCK_ICONS = [
  {
    id: 'about',
    label: 'About',
    icon: '/assets/icons/icon-about.png',
    href: '#', // TODO: point at the real destination
  },
  {
    id: 'work',
    label: 'Work',
    icon: '/assets/icons/icon-work.png',
    href: '#', // TODO
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: '/assets/icons/icon-blog.png',
    href: '#', // TODO
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: '/assets/icons/icon-contact.png',
    href: '#', // TODO
  },
];

const DESKTOP_CONFIG = {
  wallpaperSrc: WALLPAPER_SRC,
  font: FONT,
  webampSkinUrl: WEBAMP_SKIN_URL,
  webampInitialTracks: WEBAMP_INITIAL_TRACKS,
  imageWindow: IMAGE_WINDOW,
  scatteredImages: SCATTERED_IMAGES,
  dockIcons: DOCK_ICONS,
};

export default DESKTOP_CONFIG;
