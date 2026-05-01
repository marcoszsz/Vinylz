export default async function handler(req, res) {
  const { query, type = "album,track,artist,playlist" } = req.query;

  if (!query) {
    return res.status(400).json({ error: "Query obrigatória." });
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64")
      },
      body: "grant_type=client_credentials"
    });

    if (!tokenResponse.ok) {
      throw new Error("Erro ao autenticar no Spotify.");
    }

    const tokenData = await tokenResponse.json();

    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=30`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    if (!spotifyResponse.ok) {
      throw new Error("Erro ao buscar no Spotify.");
    }

    const data = await spotifyResponse.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Não foi possível buscar no Spotify."
    });
  }
}
