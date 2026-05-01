export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo nao permitido."
    });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const { artists = [], albums = [] } = req.body || {};

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: "Variaveis Spotify nao configuradas."
    });
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      },
      body: "grant_type=client_credentials"
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(500).json({
        error: "Erro ao gerar token Spotify."
      });
    }

    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`
    };

    const [artistResults, albumResults] = await Promise.all([
      Promise.all(
        artists.slice(0, 20).map((artistName) =>
          searchFirstSpotifyItem(artistName, "artist", headers)
        )
      ),
      Promise.all(
        albums.slice(0, 20).map((albumQuery) =>
          searchFirstSpotifyItem(albumQuery, "album", headers)
        )
      )
    ]);

    return res.status(200).json({
      artists: artistResults.filter(Boolean).map(normalizeArtist),
      albums: albumResults.filter(Boolean).map(normalizeAlbum)
    });
  } catch (error) {
    console.error("Erro spotifyOnboarding:", error);

    return res.status(500).json({
      error: "Nao foi possivel carregar imagens do onboarding."
    });
  }
}

async function searchFirstSpotifyItem(query, type, headers) {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=1`,
    { headers }
  );

  if (!response.ok) return null;

  const data = await response.json();

  return type === "artist"
    ? data.artists?.items?.[0]
    : data.albums?.items?.[0];
}

function normalizeArtist(artist) {
  return {
    id: artist.id || "",
    name: artist.name || "",
    genre: artist.genres?.slice(0, 2).join(" / ") || "Artista",
    image: artist.images?.[0]?.url || ""
  };
}

function normalizeAlbum(album) {
  return {
    id: album.id || "",
    title: album.name || "",
    artist: album.artists?.map((artist) => artist.name).join(", ") || "Artista",
    genre: album.release_date?.slice(0, 4) || "Album",
    image: album.images?.[0]?.url || ""
  };
}
