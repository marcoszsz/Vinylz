export default async function handler(req, res) {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        spotifyConnected: false,
        error: "Spotify não conectado."
      });
    }

    const [topArtistsShort, topArtistsMedium, topTracksShort, topTracksMedium, recentlyPlayed] =
      await Promise.all([
        spotifyFetch("https://api.spotify.com/v1/me/top/artists?limit=10&time_range=short_term", accessToken),
        spotifyFetch("https://api.spotify.com/v1/me/top/artists?limit=10&time_range=medium_term", accessToken),
        spotifyFetch("https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=short_term", accessToken),
        spotifyFetch("https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term", accessToken),
        spotifyFetch("https://api.spotify.com/v1/me/player/recently-played?limit=20", accessToken)
      ]);

    const artists = normalizeArtists([
      ...(topArtistsShort?.items || []),
      ...(topArtistsMedium?.items || [])
    ]);

    const tracks = normalizeTracks([
      ...(topTracksShort?.items || []),
      ...(topTracksMedium?.items || [])
    ]);

    const recent = normalizeRecentlyPlayed(recentlyPlayed?.items || []);

    const topGenres = extractTopGenres([
      ...(topArtistsShort?.items || []),
      ...(topArtistsMedium?.items || [])
    ]);

    return res.status(200).json({
      spotifyConnected: true,
      topArtists: artists,
      topTracks: tracks,
      recentlyPlayed: recent,
      topGenres,
      source: "spotify"
    });
  } catch (error) {
    console.error("Erro spotifyWrapped:", error);

    return res.status(500).json({
      spotifyConnected: false,
      error: "Erro ao montar Spotify Wrapped."
    });
  }
}

function getAccessToken(req) {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  if (req.query.access_token) {
    return String(req.query.access_token);
  }

  return null;
}

async function spotifyFetch(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    throw new Error("Token Spotify expirado ou inválido.");
  }

  if (!response.ok) {
    const text = await response.text();
    console.error("Spotify API error:", response.status, text);
    return null;
  }

  return response.json();
}

function normalizeArtists(items) {
  const map = new Map();

  items.forEach((artist) => {
    if (!artist?.id) return;

    if (!map.has(artist.id)) {
      map.set(artist.id, {
        id: artist.id,
        name: artist.name,
        image: artist.images?.[0]?.url || "",
        genres: artist.genres || [],
        followers: artist.followers?.total || 0,
        popularity: artist.popularity || 0,
        spotifyUrl: artist.external_urls?.spotify || "",
        count: 0
      });
    }

    map.get(artist.id).count += 1;
  });

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || b.popularity - a.popularity)
    .slice(0, 10);
}

function normalizeTracks(items) {
  const map = new Map();

  items.forEach((track) => {
    if (!track?.id) return;

    if (!map.has(track.id)) {
      map.set(track.id, {
        id: track.id,
        name: track.name,
        artist: track.artists?.map((artist) => artist.name).join(", ") || "Artista desconhecido",
        album: track.album?.name || "",
        image: track.album?.images?.[0]?.url || "",
        durationMs: track.duration_ms || 0,
        popularity: track.popularity || 0,
        spotifyUrl: track.external_urls?.spotify || "",
        count: 0
      });
    }

    map.get(track.id).count += 1;
  });

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || b.popularity - a.popularity)
    .slice(0, 10);
}

function normalizeRecentlyPlayed(items) {
  return items
    .map((entry) => {
      const track = entry.track;

      if (!track) return null;

      return {
        id: track.id,
        name: track.name,
        artist: track.artists?.map((artist) => artist.name).join(", ") || "Artista desconhecido",
        album: track.album?.name || "",
        image: track.album?.images?.[0]?.url || "",
        playedAt: entry.played_at,
        spotifyUrl: track.external_urls?.spotify || ""
      };
    })
    .filter(Boolean);
}

function extractTopGenres(artists) {
  const genreMap = new Map();

  artists.forEach((artist) => {
    const genres = artist.genres || [];

    genres.forEach((genre) => {
      const key = genre.toLowerCase();

      genreMap.set(key, {
        name: genre,
        count: (genreMap.get(key)?.count || 0) + 1
      });
    });
  });

  return Array.from(genreMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
