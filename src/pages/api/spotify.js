// pages/api/spotify.js

export default async function handler(req, res) {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

    const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
    const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';

    async function getAccessToken() {
        if (!client_id || !client_secret || !refresh_token) {
            throw new Error('Missing Spotify credentials in environment variables');
        }

        const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64'); 
        const requestBody = new URLSearchParams();
        requestBody.append('grant_type', 'refresh_token');
        requestBody.append('refresh_token', refresh_token);

        const response = await fetch(TOKEN_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Basic ${basic}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: requestBody.toString(),
        });

        const data = await response.json();
        if (!response.ok || !data.access_token) {
            throw new Error(data.error_description || data.error || 'Failed to refresh Spotify token');
        }

        return data;
    }

    try {
        const { access_token } = await getAccessToken();

        const response = await fetch(NOW_PLAYING_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        if (response.status === 204) {
            return res.status(204).json({ message: "No song playing" });
        }

        if (!response.ok) {
            const message = await response.text();
            return res.status(response.status).json({
                error: 'Failed to fetch currently playing song',
                spotifyStatus: response.status,
                spotifyBody: message,
            });
        }

        const song = await response.json();
        return res.status(200).json({
            albumImageUrl: song.item.album.images[0].url,
            artist: song.item.artists.map((artist) => artist.name).join(", "),
            title: song.item.name,
            durationMs: song.item.duration_ms,
            progressMs: song.progress_ms,
            isPlaying: song.is_playing,
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Spotify now playing request failed',
            detail: error.message,
        });
    }
}
