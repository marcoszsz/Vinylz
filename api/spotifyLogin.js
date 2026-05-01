import { randomUUID } from "node:crypto";

export default async function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const appUrl = process.env.APP_URL || "https://vinylsz.vercel.app";

  const redirectUri = `${appUrl}/api/spotifyCallback`;
  const state = randomUUID();

  const scope = [
    "user-top-read",
    "user-read-recently-played",
    "user-read-currently-playing",
    "user-read-email",
    "user-read-private"
  ].join(" ");

  const url =
    "https://accounts.spotify.com/authorize" +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  res.setHeader(
    "Set-Cookie",
    [
      `spotify_oauth_state=${state}`,
      "Path=/",
      "HttpOnly",
      appUrl.startsWith("https://") ? "Secure" : "",
      "SameSite=Lax",
      "Max-Age=600"
    ].filter(Boolean).join("; ")
  );
  res.redirect(url);
}
