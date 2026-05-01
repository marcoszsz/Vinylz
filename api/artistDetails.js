export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        error: "ID obrigatório."
      });
    }

    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(500).json({
        error: "Erro ao gerar token Spotify."
      });
    }

    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`
    };

    const artistResponse = await fetch(
      `https://api.spotify.com/v1/artists/${id}`,
      { headers }
    );

    const artistData = await artistResponse.json();

    if (!artistResponse.ok) {
      return res.status(500).json({
        error: "Erro ao buscar artista."
      });
    }

    const mainGenre = artistData.genres?.[0] || "";

    let topTracks = [];
    let albums = [];
    let relatedArtists = [];

    try {
      const tracksResponse = await fetch(
        `https://api.spotify.com/v1/artists/${id}/top-tracks?market=BR`,
        { headers }
      );

      const tracksData = await tracksResponse.json();

      topTracks = (tracksData.tracks || []).map((track) => ({
        id: track.id,
        name: track.name,
        album: track.album?.name || "",
        image: track.album?.images?.[0]?.url || "",
        url: track.external_urls?.spotify || ""
      }));
    } catch (error) {
      console.error("Erro top tracks:", error);
    }

    try {
      const albumsResponse = await fetch(
        `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single&market=BR&limit=20`,
        { headers }
      );

      const albumsData = await albumsResponse.json();

      const seenAlbums = new Set();

      albums = (albumsData.items || [])
        .filter((album) => {
          const key = album.name.toLowerCase();

          if (seenAlbums.has(key)) {
            return false;
          }

          seenAlbums.add(key);
          return true;
        })
        .map((album) => ({
          id: album.id,
          name: album.name,
          image: album.images?.[0]?.url || "",
          year: album.release_date?.slice(0, 4) || "",
          type: album.album_type || "",
          url: album.external_urls?.spotify || ""
        }));
    } catch (error) {
      console.error("Erro álbuns:", error);
    }

    try {
      if (mainGenre) {
        const relatedResponse = await fetch(
          `https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(
            mainGenre
          )}&type=artist&limit=12`,
          { headers }
        );

        const relatedData = await relatedResponse.json();

        relatedArtists = (relatedData.artists?.items || [])
          .filter((artist) => artist.id !== id)
          .map((artist) => ({
            id: artist.id,
            name: artist.name,
            image: artist.images?.[0]?.url || "",
            followers: artist.followers?.total || 0,
            popularity: artist.popularity || 0,
            url: artist.external_urls?.spotify || ""
          }));
      }
    } catch (error) {
      console.error("Erro relacionados:", error);
    }

    return res.status(200).json({
      artist: {
        id: artistData.id,
        name: artistData.name,
        image: artistData.images?.[0]?.url || "",
        followers: artistData.followers?.total || 0,
        popularity: artistData.popularity || 0,
        genres: artistData.genres || [],
        url: artistData.external_urls?.spotify || ""
      },
      topTracks,
      albums,
      relatedArtists
    });
  } catch (error) {
    console.error("Erro geral artistDetails:", error);

    return res.status(500).json({
      error: "Erro interno ao buscar detalhes do artista."
    });
  }
}