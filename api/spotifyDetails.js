export default async function handler(req, res) {
  try {
    const { type, id } = req.query;

    if (!type || !id) {
      return res.status(400).json({
        error: "Tipo e ID obrigatórios."
      });
    }

    const allowedTypes = ["album", "track", "artist", "playlist"];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        error: "Tipo inválido."
      });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Variáveis Spotify não configuradas no Vercel."
      });
    }

    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(500).json({
        error: "Erro ao gerar token Spotify.",
        details: tokenData
      });
    }

    const endpointMap = {
      album: `https://api.spotify.com/v1/albums/${id}`,
      track: `https://api.spotify.com/v1/tracks/${id}`,
      artist: `https://api.spotify.com/v1/artists/${id}`,
      playlist: `https://api.spotify.com/v1/playlists/${id}`
    };

    const spotifyResponse = await fetch(endpointMap[type], {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const data = await spotifyResponse.json();

    if (!spotifyResponse.ok) {
      return res.status(spotifyResponse.status).json({
        error: "Erro ao buscar detalhes no Spotify.",
        details: data
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Erro spotifyDetails:", error);

    return res.status(500).json({
      error: "Erro interno no servidor."
    });
  }
}