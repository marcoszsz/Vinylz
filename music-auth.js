// music-auth.js

const spotifyBtn = document.getElementById("spotifyBtn");
const appleBtn = document.getElementById("appleBtn");
const skipBtn = document.getElementById("skipBtn");
const statusBox = document.getElementById("statusBox");

/*
  CONFIG SPOTIFY

  Troque o CLIENT_ID pelo seu Client ID real do Spotify Developer Dashboard.
  Redirect URI precisa estar cadastrada no Spotify exatamente igual.

  Exemplo:
  https://vinylsz.vercel.app/spotify-callback.html
*/

const SPOTIFY_CLIENT_ID = "${SPOTIFY_CLIENT_ID}";
const SPOTIFY_REDIRECT_URI = `${window.location.origin}/spotify-callback.html`;

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "user-read-recently-played",
  "user-library-read"
];

function setStatus(message, type = "") {
  if (!statusBox) return;

  statusBox.textContent = message;
  statusBox.className = "status-box";

  if (type) {
    statusBox.classList.add(type);
  }
}

function createRandomString(length = 64) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let result = "";

  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);

  randomValues.forEach((value) => {
    result += chars[value % chars.length];
  });

  return result;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);

  return window.crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function connectSpotify() {
  try {
    if (!SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID.includes("COLOQUE")) {
      setStatus(
        "Adicione seu Spotify Client ID no arquivo music-auth.js.",
        "error"
      );
      return;
    }

    setStatus("Preparando conexão com Spotify...");

    localStorage.setItem("vinyl_music_provider", "spotify");

    const codeVerifier = createRandomString(96);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(hashed);

    localStorage.setItem("spotify_code_verifier", codeVerifier);

    const state = createRandomString(32);
    localStorage.setItem("spotify_auth_state", state);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: SPOTIFY_CLIENT_ID,
      scope: SPOTIFY_SCOPES.join(" "),
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state,
      code_challenge_method: "S256",
      code_challenge: codeChallenge
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  } catch (error) {
    console.error("Erro ao conectar Spotify:", error);
    setStatus("Erro ao iniciar login com Spotify.", "error");
  }
}

function connectAppleMusic() {
  /*
    Apple Music no navegador precisa do MusicKit JS.

    Para funcionar de verdade, você vai precisar de:
    - Apple Developer Account;
    - MusicKit Identifier;
    - Private Key;
    - Developer Token gerado no backend;
    - Music User Token no frontend.

    Por enquanto, deixei como visual/placeholder para não quebrar.
  */

  localStorage.setItem("vinyl_music_provider", "apple_music");

  setStatus(
    "Apple Music ainda está em preparação no Vinyl. Use Spotify por enquanto.",
    "error"
  );
}

function skipConnection() {
  localStorage.setItem("vinyl_music_provider", "none");
  localStorage.setItem("vinyl_music_auth_skipped", "true");

  setStatus("Tudo certo. Entrando sem conectar música...", "success");

  setTimeout(() => {
    window.location.href = "home.html";
  }, 700);
}

spotifyBtn?.addEventListener("click", connectSpotify);
appleBtn?.addEventListener("click", connectAppleMusic);
skipBtn?.addEventListener("click", skipConnection);