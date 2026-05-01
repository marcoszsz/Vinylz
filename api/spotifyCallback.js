export default async function handler(req, res) {
  const code = req.query.code;
  const state = req.query.state;
  const storedState = getCookie(req.headers.cookie || "", "spotify_oauth_state");

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || "https://vinylsz.vercel.app";

  const redirectUri = `${appUrl}/api/spotifyCallback`;

  res.setHeader(
    "Set-Cookie",
    [
      "spotify_oauth_state=",
      "Path=/",
      "HttpOnly",
      appUrl.startsWith("https://") ? "Secure" : "",
      "SameSite=Lax",
      "Max-Age=0"
    ].filter(Boolean).join("; ")
  );

  if (!code || !state || !storedState || state !== storedState) {
    return res.redirect(`${appUrl}/profile.html?spotify=error`);
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
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.redirect(`${appUrl}/profile.html?spotify=error`);
    }

    const callbackParams = new URLSearchParams({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || ""
    });

    return res.redirect(`${appUrl}/spotify-callback.html#${callbackParams}`);
  } catch (error) {
    return res.redirect(`${appUrl}/profile.html?spotify=error`);
  }
}

function getCookie(cookieHeader, name) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}
