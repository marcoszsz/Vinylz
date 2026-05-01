import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  deleteField,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   ELEMENTS
========================= */

const heroBlur = document.getElementById("heroBlur");
const nowCard = document.getElementById("nowCard");
const spotifyStatus = document.getElementById("spotifyStatus");

const tracksCount = document.getElementById("tracksCount");
const artistsCount = document.getElementById("artistsCount");
const moodLabel = document.getElementById("moodLabel");

const moodDescription = document.getElementById("moodDescription");
const moodBars = document.getElementById("moodBars");

const recentTimeline = document.getElementById("recentTimeline");
const topArtistsList = document.getElementById("topArtistsList");
const activityBars = document.getElementById("activityBars");

const filterChips = document.querySelectorAll(".filter-chip");

/* =========================
   STATE
========================= */

let currentUser = null;
let currentUserData = null;
let allTracks = [];
let currentFilter = "all";

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  await loadRecentlyPlayed();
});

/* =========================
   FILTERS
========================= */

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    filterChips.forEach((btn) => btn.classList.remove("active"));
    chip.classList.add("active");

    currentFilter = chip.dataset.filter;
    renderTimeline(getFilteredTracks());
  });
});

/* =========================
   LOAD SPOTIFY
========================= */

async function loadRecentlyPlayed(hasRetriedRefresh = false) {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      showNotConnected();
      return;
    }

    const userData = {
      ...userSnap.data(),
      ...(currentUserData || {}),
      ...(await loadPrivateSpotifyData(currentUser.uid, userSnap.data()))
    };

    currentUserData = userData;

    if (!userData.spotifyConnected || !userData.spotifyToken) {
      showNotConnected();
      return;
    }

    spotifyStatus.textContent = "Spotify conectado";

    const response = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=50",
      {
        headers: {
          Authorization: `Bearer ${userData.spotifyToken}`
        }
      }
    );

    if (response.status === 401 || response.status === 403) {
      if (!hasRetriedRefresh && userData.spotifyRefreshToken) {
        const refreshedData = await refreshSpotifyAccessToken(userData.spotifyRefreshToken);

        if (refreshedData) {
          await loadRecentlyPlayed(true);
          return;
        }
      }

      showNeedsReconnect();
      return;
    }

    if (!response.ok) {
      throw new Error(`Spotify API: ${response.status}`);
    }

    const data = await response.json();

    const items = data.items || [];

    allTracks = normalizeTracks(items);

    renderEverything();
  } catch (error) {
    console.error("Erro Spotify:", error);

    nowCard.innerHTML = `
      <p class="message">
        Não conseguimos carregar sua atividade recente.
      </p>
    `;

    recentTimeline.innerHTML = `
      <p class="message">
        Erro ao conectar com Spotify.
      </p>
    `;
  }
}

async function refreshSpotifyAccessToken(refreshToken) {
  try {
    const response = await fetch("/api/spotifyRefresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error(`Spotify refresh: ${response.status}`);
    }

    const data = await response.json();

    if (!data.accessToken) return null;

    currentUserData = {
      ...currentUserData,
      spotifyConnected: true,
      spotifyToken: data.accessToken,
      spotifyRefreshToken: data.refreshToken || refreshToken
    };

    await setDoc(doc(db, "users", currentUser.uid, "private", "spotify"), {
      accessToken: currentUserData.spotifyToken,
      refreshToken: currentUserData.spotifyRefreshToken,
      tokenRefreshedAt: serverTimestamp(),
      tokenExpiresAt: Date.now() + (data.expiresIn || 3600) * 1000
    }, { merge: true });

    await setDoc(doc(db, "users", currentUser.uid), {
      spotifyConnected: true,
      spotifyToken: deleteField(),
      spotifyRefreshToken: deleteField(),
      spotifyTokenRefreshedAt: deleteField(),
      spotifyTokenExpiresAt: deleteField()
    }, { merge: true });

    return currentUserData;
  } catch (error) {
    console.error("Erro ao renovar token Spotify:", error);
    return null;
  }
}

/* =========================
   NOT CONNECTED
========================= */

function showNotConnected() {
  spotifyStatus.textContent = "Spotify não conectado";

  nowCard.innerHTML = `
    <p class="message">
      Conecte o Spotify no perfil para ver suas músicas recentes.
    </p>
  `;

  recentTimeline.innerHTML = `
    <p class="message">
      Nenhuma atividade encontrada.
    </p>
  `;
}

function showNeedsReconnect() {
  spotifyStatus.textContent = "Spotify precisa reconectar";

  nowCard.innerHTML = `
    <div class="spotify-reconnect-card">
      <span>!</span>
      <h2>Reconecte o Spotify</h2>
      <p>Atualizamos a integracao para mostrar sua atividade em tempo real. E so reconectar uma vez.</p>

      <div class="now-actions">
        <a href="/api/spotifyLogin">Reconectar Spotify</a>
      </div>
    </div>
  `;

  recentTimeline.innerHTML = `
    <p class="message">
      Depois de reconectar, sua atividade recente aparece aqui automaticamente.
    </p>
  `;
}

async function loadPrivateSpotifyData(uid, publicUserData) {
  const privateSpotifyRef = doc(db, "users", uid, "private", "spotify");
  const privateSpotifySnap = await getDoc(privateSpotifyRef);
  let privateSpotifyData = privateSpotifySnap.exists()
    ? privateSpotifySnap.data()
    : {};

  if (publicUserData.spotifyToken || publicUserData.spotifyRefreshToken) {
    const accessToken = publicUserData.spotifyToken || privateSpotifyData.accessToken || "";
    const refreshToken = publicUserData.spotifyRefreshToken || privateSpotifyData.refreshToken || "";

    await setDoc(privateSpotifyRef, {
      accessToken,
      refreshToken,
      connectedAt: privateSpotifyData.connectedAt || serverTimestamp(),
      tokenRefreshedAt: serverTimestamp(),
      tokenExpiresAt: publicUserData.spotifyTokenExpiresAt || privateSpotifyData.tokenExpiresAt || null
    }, { merge: true });

    await setDoc(doc(db, "users", uid), {
      spotifyConnected: true,
      spotifyToken: deleteField(),
      spotifyRefreshToken: deleteField(),
      spotifyTokenRefreshedAt: deleteField(),
      spotifyTokenExpiresAt: deleteField()
    }, { merge: true });

    privateSpotifyData = {
      ...privateSpotifyData,
      accessToken,
      refreshToken,
      tokenExpiresAt: publicUserData.spotifyTokenExpiresAt || privateSpotifyData.tokenExpiresAt || null
    };
  }

  return {
    spotifyConnected: Boolean(
      publicUserData.spotifyConnected ||
      privateSpotifyData.accessToken ||
      privateSpotifyData.refreshToken
    ),
    spotifyToken: privateSpotifyData.accessToken || "",
    spotifyRefreshToken: privateSpotifyData.refreshToken || "",
    spotifyTokenExpiresAt: privateSpotifyData.tokenExpiresAt || null
  };
}

/* =========================
   NORMALIZE
========================= */

function normalizeTracks(items) {
  return items
    .map((item) => {
      const track = item.track;

      if (!track) return null;

      return {
        id: track.id,
        name: track.name,
        artist: track.artists?.map((a) => a.name).join(", ") || "Artista",
        mainArtist: track.artists?.[0]?.name || "Artista",
        album: track.album?.name || "",
        image: track.album?.images?.[0]?.url || "",
        url: track.external_urls?.spotify || "#",
        playedAt: item.played_at
      };
    })
    .filter(Boolean);
}

/* =========================
   RENDER ALL
========================= */

function renderEverything() {
  if (!allTracks.length) {
    recentTimeline.innerHTML = `
      <p class="message">
        Nenhuma música encontrada.
      </p>
    `;
    return;
  }

  renderHero();
  renderStats();
  renderMood();
  renderTimeline(getFilteredTracks());
  renderTopArtists();
  renderActivity();
}

/* =========================
   HERO
========================= */

function renderHero() {
  const latest = allTracks[0];

  if (!latest) return;

  if (heroBlur) {
    heroBlur.style.backgroundImage = `url("${latest.image}")`;
  }

  nowCard.innerHTML = `
    <img src="${latest.image}" alt="${latest.name}">

    <span>Última música</span>

    <h2>${latest.name}</h2>

    <p>${latest.artist}</p>

    <p>${timeAgo(latest.playedAt)}</p>

    <div class="now-actions">
      <a href="${latest.url}" target="_blank">
        Abrir Spotify
      </a>
    </div>
  `;
}

/* =========================
   STATS
========================= */

function renderStats() {
  const artists = new Set(allTracks.map((t) => t.mainArtist));

  tracksCount.textContent = allTracks.length;
  artistsCount.textContent = artists.size;

  const mood = detectMood();

  moodLabel.textContent = mood.label;
}

/* =========================
   MOOD
========================= */

function renderMood() {
  const mood = detectMood();

  moodDescription.textContent = mood.description;

  moodBars.innerHTML = "";

  mood.scores.forEach((score) => {
    const row = document.createElement("div");

    row.className = "mood-row";

    row.innerHTML = `
      <div class="mood-row-header">
        <span>${score.label}</span>
        <span>${score.value}%</span>
      </div>

      <div class="mood-track">
        <div class="mood-fill" style="width:${score.value}%"></div>
      </div>
    `;

    moodBars.appendChild(row);
  });
}

function detectMood() {
  const text = allTracks
    .map((t) => `${t.name} ${t.artist}`)
    .join(" ")
    .toLowerCase();

  let rock = 40;
  let pop = 50;
  let nostalgia = 60;

  if (
    text.includes("iron") ||
    text.includes("metal") ||
    text.includes("rock")
  ) {
    rock = 92;
    nostalgia = 75;
  }

  if (
    text.includes("michael") ||
    text.includes("bruno") ||
    text.includes("pop")
  ) {
    pop = 90;
  }

  let label = "Mix";
  let description = "Seu gosto recente mistura estilos.";

  if (rock > pop) {
    label = "Rock intenso";
    description = "Seu momento atual está cheio de energia e guitarras.";
  }

  if (pop > rock) {
    label = "Pop nostálgico";
    description = "Você está em uma fase mais melódica e popular.";
  }

  return {
    label,
    description,
    scores: [
      { label: "Energia", value: rock },
      { label: "Pop", value: pop },
      { label: "Nostalgia", value: nostalgia }
    ]
  };
}

/* =========================
   FILTER
========================= */

function getFilteredTracks() {
  if (currentFilter === "all") return allTracks;

  if (currentFilter === "today") {
    const today = new Date().toDateString();

    return allTracks.filter((track) => {
      return new Date(track.playedAt).toDateString() === today;
    });
  }

  if (currentFilter === "rock") {
    return allTracks.filter((track) =>
      `${track.artist} ${track.name}`.toLowerCase().includes("rock") ||
      `${track.artist}`.toLowerCase().includes("iron")
    );
  }

  if (currentFilter === "pop") {
    return allTracks.filter((track) =>
      `${track.artist} ${track.name}`.toLowerCase().includes("pop") ||
      `${track.artist}`.toLowerCase().includes("michael")
    );
  }

  if (currentFilter === "night") {
    return allTracks.filter((track) => {
      const hour = new Date(track.playedAt).getHours();
      return hour >= 18 || hour <= 5;
    });
  }

  return allTracks;
}

/* =========================
   TIMELINE
========================= */

function renderTimeline(tracks) {
  recentTimeline.innerHTML = "";

  if (!tracks.length) {
    recentTimeline.innerHTML = `
      <p class="message">
        Nada encontrado.
      </p>
    `;
    return;
  }

  const grouped = groupByDay(tracks);

  Object.entries(grouped).forEach(([day, items]) => {
    const group = document.createElement("div");
    group.className = "day-group";

    group.innerHTML = `
      <h3 class="day-title">${day}</h3>
    `;

    items.forEach((track) => {
      const card = document.createElement("article");

      card.className = "track-card";

      card.innerHTML = `
        <img src="${track.image}" alt="${track.name}">

        <div class="track-info">
          <h3>${track.name}</h3>
          <p>${track.artist}</p>
          <p>${track.album}</p>
        </div>

        <span class="track-time">
          ${timeAgo(track.playedAt)}
        </span>

        <a href="${track.url}" target="_blank" class="spotify-btn">
          Spotify
        </a>
      `;

      group.appendChild(card);
    });

    recentTimeline.appendChild(group);
  });
}

function groupByDay(tracks) {
  return tracks.reduce((acc, track) => {
    const date = new Date(track.playedAt);

    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    let label = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short"
    });

    if (date.toDateString() === today.toDateString()) {
      label = "Hoje";
    }

    if (date.toDateString() === yesterday.toDateString()) {
      label = "Ontem";
    }

    if (!acc[label]) {
      acc[label] = [];
    }

    acc[label].push(track);

    return acc;
  }, {});
}

/* =========================
   TOP ARTISTS
========================= */

function renderTopArtists() {
  const counter = {};

  allTracks.forEach((track) => {
    counter[track.mainArtist] = (counter[track.mainArtist] || 0) + 1;
  });

  const sorted = Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  topArtistsList.innerHTML = "";

  sorted.forEach(([artist, count], index) => {
    const row = document.createElement("div");

    row.className = "artist-row";

    row.innerHTML = `
      <div class="artist-rank">
        ${index + 1}
      </div>

      <div>
        <strong>${artist}</strong>
        <span>${count} músicas</span>
      </div>

      <span>🔥</span>
    `;

    topArtistsList.appendChild(row);
  });
}

/* =========================
   ACTIVITY
========================= */

function renderActivity() {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const counts = [0, 0, 0, 0, 0, 0, 0];

  allTracks.forEach((track) => {
    const day = new Date(track.playedAt).getDay();
    counts[day]++;
  });

  const max = Math.max(...counts, 1);

  activityBars.innerHTML = "";

  counts.forEach((count, index) => {
    const row = document.createElement("div");

    row.className = "activity-row";

    row.innerHTML = `
      <span>${days[index]}</span>

      <div class="activity-track">
        <div
          class="activity-fill"
          style="width:${(count / max) * 100}%">
        </div>
      </div>
    `;

    activityBars.appendChild(row);
  });
}

/* =========================
   HELPERS
========================= */

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();

  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
