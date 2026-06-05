const ALLOWED_TYPES = new Set(["album", "track", "artist", "playlist"]);
const MAX_QUERY_LENGTH = 120;

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const query = String(req.query.query || "").trim();
  const type = normalizeType(req.query.type);

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Spotify nao configurado." });
  }

  if (!query) {
    return res.status(400).json({ error: "Query obrigatoria." });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: "Query muito longa." });
  }

  if (!type) {
    return res.status(400).json({ error: "Tipo de busca invalido." });
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

    if (!tokenResponse.ok) {
      throw new Error("Erro ao autenticar no Spotify.");
    }

    const tokenData = await tokenResponse.json();
    const params = new URLSearchParams({
      q: query,
      type,
      limit: "20"
    });

    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    if (!spotifyResponse.ok) {
      throw new Error(`Erro ao buscar no Spotify: ${spotifyResponse.status}`);
    }

    const data = await spotifyResponse.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Nao foi possivel buscar no Spotify."
    });
  }
}

function normalizeType(value) {
  const requested = String(value || "album,track,artist,playlist")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!requested.length || requested.some((item) => !ALLOWED_TYPES.has(item))) {
    return "";
  }

  return [...new Set(requested)].join(",");
}
