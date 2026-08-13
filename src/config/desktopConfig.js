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
};

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
  dockIcons: DOCK_ICONS,
};

export default DESKTOP_CONFIG;
