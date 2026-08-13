import Desktop from '../components/desktop/Desktop';

// The homepage is a single immersive desktop screen (see
// src/components/desktop/Desktop.jsx). Every asset path lives in
// src/config/desktopConfig.js — edit that file to swap in real art.
//
// NOTE: The Spotify "Now Playing" / "Top Artists" integration
// (src/components/NowPlaying.jsx, src/components/TopArtists.jsx, and the
// src/pages/api/spotify* routes) is intentionally left untouched and unused
// here so it can be dropped back into the new design later.
const HomePage = () => <Desktop />;

export default HomePage;
