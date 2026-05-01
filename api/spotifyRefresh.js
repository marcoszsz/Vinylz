export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo nao permitido."
    });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const { refreshToken } = req.body || {};

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: "Variaveis Spotify nao configuradas."
    });
  }

  if (!refreshToken) {
    return res.status(400).json({
      error: "Refresh token obrigatorio."
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
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(tokenResponse.status).json({
        error: "Nao foi possivel renovar o token Spotify.",
        details: tokenData
      });
    }

    return res.status(200).json({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      expiresIn: tokenData.expires_in || 3600
    });
  } catch (error) {
    console.error("Erro spotifyRefresh:", error);

    return res.status(500).json({
      error: "Erro interno no servidor."
    });
  }
}
