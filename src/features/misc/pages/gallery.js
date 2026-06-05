import { auth } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const galleryTitle = document.getElementById("galleryTitle");
const gallerySearchInput = document.getElementById("gallerySearchInput");
const gallerySearchBtn = document.getElementById("gallerySearchBtn");
const galleryGrid = document.getElementById("galleryGrid");
const tabs = document.querySelectorAll(".gallery-tab");

let currentTab = "artists";
let lastQuery = "";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");

  if (query) {
    gallerySearchInput.value = query;
    searchGallery(query);
  }
});

gallerySearchBtn?.addEventListener("click", () => {
  const query = gallerySearchInput.value.trim();

  if (!query) return;

  window.history.pushState({}, "", `gallery.html?q=${encodeURIComponent(query)}`);
  searchGallery(query);
});

gallerySearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    gallerySearchBtn.click();
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    currentTab = tab.dataset.tab;

    if (lastQuery) {
      searchGallery(lastQuery);
    }
  });
});

async function searchGallery(query) {
  lastQuery = query;

  galleryTitle.textContent = `Galeria de ${query}`;

  galleryGrid.innerHTML = `
    <p class="message">Carregando imagens...</p>
  `;

  try {
    const data = await searchSpotify(query);

    const cards = [];

    if (currentTab === "artists") {
      const artists = filterByQuery(data.artists?.items || [], query, (artist) => artist.name);
      cards.push(...artists.map(formatArtistCard));
    }

    if (currentTab === "albums") {
      const albums = filterByQuery(data.albums?.items || [], query, (album) =>
        `${album.name} ${album.artists?.map((artist) => artist.name).join(" ") || ""}`
      );
      cards.push(...albums.map(formatAlbumCard));
    }

    if (currentTab === "tracks") {
      const tracks = filterByQuery(data.tracks?.items || [], query, (track) =>
        `${track.name} ${track.artists?.map((artist) => artist.name).join(" ") || ""}`
      );
      cards.push(...tracks.map(formatTrackCard));
    }

    renderGallery(cards);

  } catch (error) {
    console.error(error);

    galleryGrid.innerHTML = `
      <p class="message">Erro ao carregar galeria.</p>
    `;
  }
}

async function searchSpotify(query) {
  const type = getSpotifyType(currentTab);

  const response = await fetch(
    `/api/searchSpotify?query=${encodeURIComponent(query)}&type=${type}`
  );

  if (!response.ok) {
    throw new Error("Erro na API Spotify.");
  }

  return await response.json();
}

function getSpotifyType(tab) {
  const types = {
    artists: "artist",
    albums: "album",
    tracks: "track"
  };

  return types[tab] || "artist";
}

function filterByQuery(items, query, getText) {
  const normalizedQuery = normalizeText(query);
  const matches = items.filter((item) => normalizeText(getText(item)).includes(normalizedQuery));

  return matches.length ? matches : items.slice(0, 1);
}

function formatArtistCard(artist) {
  return {
    type: "Artista",
    title: artist.name,
    subtitle: `${artist.followers?.total?.toLocaleString("pt-BR") || 0} seguidores`,
    image: artist.images?.[0]?.url || "",
    spotifyUrl: artist.external_urls?.spotify || "#",
    detailsUrl: `details.html?type=artist&id=${artist.id}`
  };
}

function formatAlbumCard(album) {
  return {
    type: "Álbum",
    title: album.name,
    subtitle: album.artists?.map((a) => a.name).join(", ") || "",
    image: album.images?.[0]?.url || "",
    spotifyUrl: album.external_urls?.spotify || "#",
    detailsUrl: `details.html?type=album&id=${album.id}`
  };
}

function formatTrackCard(track) {
  return {
    type: "Música",
    title: track.name,
    subtitle: track.artists?.map((a) => a.name).join(", ") || "",
    image: track.album?.images?.[0]?.url || "",
    spotifyUrl: track.external_urls?.spotify || "#",
    detailsUrl: `details.html?type=track&id=${track.id}`
  };
}

function renderGallery(cards) {
  galleryGrid.innerHTML = "";

  const validCards = cards.filter((card) => card.image);

  if (!validCards.length) {
    galleryGrid.innerHTML = `
      <p class="message">Nenhuma imagem encontrada.</p>
    `;
    return;
  }

  validCards.forEach((card) => {
    const item = document.createElement("article");
    item.className = "gallery-card";

    item.innerHTML = `
      <img src="${card.image}" alt="${escapeHtml(card.title)}">

      <div class="gallery-card-content">
        <span>${card.type}</span>
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.subtitle)}</p>
      </div>

      <div class="card-actions">
        <a href="${card.detailsUrl}">Detalhes</a>
        <a href="${card.spotifyUrl}" target="_blank">Spotify</a>
      </div>
    `;

    item.addEventListener("click", (event) => {
      if (event.target.tagName.toLowerCase() === "a") return;
      window.location.href = card.detailsUrl;
    });

    galleryGrid.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text || "";
  return div.innerHTML;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
