let cached = null;

/**
 * A tiny silent WAV as a data: URI, generated once at runtime (no binary
 * asset needed). Webamp's Track type requires a playable `url`, but we're
 * using it purely as a "now playing" display — Spotify's API only exposes
 * metadata for the currently playing track, not a streamable audio file
 * (that's DRM'd, only playable through Spotify's own official clients) — so
 * this stands in as a harmless placeholder that Webamp never actually plays.
 */
export function getSilentAudioDataUri() {
  if (cached) return cached;

  const sampleRate = 8000;
  const seconds = 0.5;
  const numSamples = Math.round(sampleRate * seconds);
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + numSamples);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate (1 byte/sample here)
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, numSamples, true);

  // 8-bit unsigned PCM silence is the midpoint, 128.
  new Uint8Array(buffer, headerSize).fill(128);

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

  cached = `data:audio/wav;base64,${btoa(binary)}`;
  return cached;
}
