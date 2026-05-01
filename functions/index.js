const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const SPOTIFY_CLIENT_ID = defineSecret("SPOTIFY_CLIENT_ID");
const SPOTIFY_CLIENT_SECRET = defineSecret("SPOTIFY_CLIENT_SECRET");

exports.searchSpotify = onRequest(
  {
    cors: true,
    secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET]
  },
  async (req, res) => {
    try {
      const query = req.query.query;
      const type = req.query.type || "album,track,artist,playlist";

      if (!query) {
        return res.status(400).json({
          error: "Query obrigatória."
        });
      }

      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              `${SPOTIFY_CLIENT_ID.value()}:${SPOTIFY_CLIENT_SECRET.value()}`
            ).toString("base64")
        },
        body: "grant_type=client_credentials"
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return res.status(500).json({
          error: "Erro ao gerar token Spotify."
        });
      }

      const spotifyResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=30`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`
          }
        }
      );

      const spotifyData = await spotifyResponse.json();

      if (!spotifyResponse.ok) {
        return res.status(500).json({
          error: "Erro ao buscar no Spotify."
        });
      }

      return res.status(200).json(spotifyData);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: "Erro interno."
      });
    }
  }
);