import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const onboardingForm = document.getElementById("onboardingForm");
const welcomeName = document.getElementById("welcomeName");
const skipOnboardingBtn = document.getElementById("skipOnboardingBtn");
const bioInput = document.getElementById("bioInput");

const artistSearchInput = document.getElementById("artistSearchInput");
const artistsGrid = document.getElementById("artistsGrid");
const selectedArtistsPreview = document.getElementById("selectedArtistsPreview");
const selectedArtistsCount = document.getElementById("selectedArtistsCount");
const emptyArtistsMessage = document.getElementById("emptyArtistsMessage");

const albumSearchInput = document.getElementById("albumSearchInput");
const albumsGrid = document.getElementById("albumsGrid");
const selectedAlbumsPreview = document.getElementById("selectedAlbumsPreview");
const selectedAlbumsCount = document.getElementById("selectedAlbumsCount");
const emptyAlbumsMessage = document.getElementById("emptyAlbumsMessage");

let currentUser = null;
let selectedArtists = [];
let selectedAlbums = [];
let displayedArtists = [];
let displayedAlbums = [];
let artistSearchTimeout = null;
let albumSearchTimeout = null;

const artists = [
  { name: "Travis Scott", genre: "Rap / Trap", image: "" },
  { name: "The Weeknd", genre: "Pop / R&B", image: "" },
  { name: "Arctic Monkeys", genre: "Indie Rock", image: "" },
  { name: "Kendrick Lamar", genre: "Hip Hop", image: "" },
  { name: "Taylor Swift", genre: "Pop", image: "" },
  { name: "Billie Eilish", genre: "Pop Alternativo", image: "" },
  { name: "Drake", genre: "Rap / R&B", image: "" },
  { name: "SZA", genre: "R&B", image: "" },
  { name: "Lana Del Rey", genre: "Alternative", image: "" },
  { name: "Tyler, The Creator", genre: "Hip Hop", image: "" },
  { name: "Tame Impala", genre: "Psychedelic Pop", image: "" },
  { name: "Frank Ocean", genre: "R&B", image: "" },
  { name: "Ariana Grande", genre: "Pop", image: "" },
  { name: "Beyoncé", genre: "Pop / R&B", image: "" },
  { name: "Rihanna", genre: "Pop / R&B", image: "" },
  { name: "Post Malone", genre: "Rap / Pop", image: "" },
  { name: "Doja Cat", genre: "Pop / Rap", image: "" },
  { name: "Olivia Rodrigo", genre: "Pop Rock", image: "" },
  { name: "Bruno Mars", genre: "Pop / Funk", image: "" },
  { name: "Lady Gaga", genre: "Pop", image: "" },
  { name: "Coldplay", genre: "Pop Rock", image: "" },
  { name: "Radiohead", genre: "Alternative Rock", image: "" },
  { name: "Nirvana", genre: "Grunge", image: "" },
  { name: "Metallica", genre: "Metal", image: "" },
  { name: "Queen", genre: "Rock", image: "" },
  { name: "Michael Jackson", genre: "Pop", image: "" },
  { name: "Kanye West", genre: "Hip Hop", image: "" },
  { name: "Playboi Carti", genre: "Trap", image: "" },
  { name: "21 Savage", genre: "Rap", image: "" },
  { name: "Future", genre: "Trap", image: "" },
  { name: "Matuê", genre: "Trap BR", image: "" },
  { name: "Teto", genre: "Trap BR", image: "" },
  { name: "WIU", genre: "Trap BR", image: "" },
  { name: "Veigh", genre: "Trap BR", image: "" },
  { name: "Djavan", genre: "MPB", image: "" },
  { name: "Caetano Veloso", genre: "MPB", image: "" },
  { name: "Gilberto Gil", genre: "MPB", image: "" },
  { name: "Marília Mendonça", genre: "Sertanejo", image: "" },
  { name: "Jorge & Mateus", genre: "Sertanejo", image: "" },
  { name: "Anitta", genre: "Pop / Funk", image: "" },
  { name: "Ludmilla", genre: "Funk / Pop", image: "" },
  { name: "Pabllo Vittar", genre: "Pop", image: "" }
];

const albums = [
  { title: "Utopia", artist: "Travis Scott", genre: "Rap / Trap", image: "" },
  { title: "ASTROWORLD", artist: "Travis Scott", genre: "Rap / Trap", image: "" },
  { title: "After Hours", artist: "The Weeknd", genre: "Pop / R&B", image: "" },
  { title: "Dawn FM", artist: "The Weeknd", genre: "Pop / R&B", image: "" },
  { title: "AM", artist: "Arctic Monkeys", genre: "Indie Rock", image: "" },
  { title: "Favourite Worst Nightmare", artist: "Arctic Monkeys", genre: "Indie Rock", image: "" },
  { title: "DAMN.", artist: "Kendrick Lamar", genre: "Hip Hop", image: "" },
  { title: "good kid, m.A.A.d city", artist: "Kendrick Lamar", genre: "Hip Hop", image: "" },
  { title: "1989", artist: "Taylor Swift", genre: "Pop", image: "" },
  { title: "folklore", artist: "Taylor Swift", genre: "Pop / Indie", image: "" },
  { title: "HIT ME HARD AND SOFT", artist: "Billie Eilish", genre: "Pop Alternativo", image: "" },
  { title: "WHEN WE ALL FALL ASLEEP", artist: "Billie Eilish", genre: "Pop Alternativo", image: "" },
  { title: "Scorpion", artist: "Drake", genre: "Rap / R&B", image: "" },
  { title: "Take Care", artist: "Drake", genre: "Rap / R&B", image: "" },
  { title: "SOS", artist: "SZA", genre: "R&B", image: "" },
  { title: "Ctrl", artist: "SZA", genre: "R&B", image: "" },
  { title: "Born To Die", artist: "Lana Del Rey", genre: "Alternative", image: "" },
  { title: "Norman Fucking Rockwell!", artist: "Lana Del Rey", genre: "Alternative", image: "" },
  { title: "IGOR", artist: "Tyler, The Creator", genre: "Hip Hop", image: "" },
  { title: "CALL ME IF YOU GET LOST", artist: "Tyler, The Creator", genre: "Hip Hop", image: "" },
  { title: "Currents", artist: "Tame Impala", genre: "Psychedelic Pop", image: "" },
  { title: "Blonde", artist: "Frank Ocean", genre: "R&B", image: "" },
  { title: "channel ORANGE", artist: "Frank Ocean", genre: "R&B", image: "" },
  { title: "SOUR", artist: "Olivia Rodrigo", genre: "Pop Rock", image: "" },
  { title: "GUTS", artist: "Olivia Rodrigo", genre: "Pop Rock", image: "" },
  { title: "Random Access Memories", artist: "Daft Punk", genre: "Eletrônica", image: "" },
  { title: "Nevermind", artist: "Nirvana", genre: "Grunge", image: "" },
  { title: "The Dark Side of the Moon", artist: "Pink Floyd", genre: "Rock", image: "" },
  { title: "Thriller", artist: "Michael Jackson", genre: "Pop", image: "" },
  { title: "Graduation", artist: "Kanye West", genre: "Hip Hop", image: "" },
  { title: "Die Lit", artist: "Playboi Carti", genre: "Trap", image: "" },
  { title: "HEROES & VILLAINS", artist: "Metro Boomin", genre: "Trap", image: "" },
  { title: "Máquina do Tempo", artist: "Matuê", genre: "Trap BR", image: "" },
  { title: "333", artist: "Matuê", genre: "Trap BR", image: "" },
  { title: "Lume", artist: "Filipe Ret", genre: "Rap BR", image: "" },
  { title: "O Dono do Lugar", artist: "Djavan", genre: "MPB", image: "" },
  { title: "Transa", artist: "Caetano Veloso", genre: "MPB", image: "" },
  { title: "Acabou Chorare", artist: "Novos Baianos", genre: "MPB", image: "" },
  { title: "Todos os Cantos", artist: "Marília Mendonça", genre: "Sertanejo", image: "" },
  { title: "Numanice", artist: "Ludmilla", genre: "Pagode / Pop", image: "" }
];

displayedArtists = artists;
displayedAlbums = albums;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      showMessage("Perfil não encontrado. Faça login novamente.");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);

      return;
    }

    const userData = userSnap.data();

    if (welcomeName) {
      welcomeName.textContent =
        userData.username ||
        userData.displayName ||
        user.displayName ||
        "Usuário Vinyl";
    }

    if (userData.onboardingCompleted) {
      window.location.href = "home.html";
      return;
    }

    renderArtists();
    renderAlbums();
    hydrateDefaultMedia();
  } catch (error) {
    console.error(error);
    showMessage("Erro ao carregar seu perfil.");
  }
});

artistSearchInput?.addEventListener("input", () => {
  clearTimeout(artistSearchTimeout);
  artistSearchTimeout = setTimeout(searchArtists, 300);
});

albumSearchInput?.addEventListener("input", () => {
  clearTimeout(albumSearchTimeout);
  albumSearchTimeout = setTimeout(searchAlbums, 300);
});

function renderArtists() {
  const searchTerm = normalizeText(artistSearchInput?.value || "");

  const filteredArtists = displayedArtists.filter((artist) => {
    return normalizeText(artist.name).includes(searchTerm) ||
      normalizeText(artist.genre).includes(searchTerm);
  });

  renderMediaGrid({
    items: filteredArtists,
    selectedItems: selectedArtists,
    grid: artistsGrid,
    emptyMessage: emptyArtistsMessage,
    titleKey: "name",
    subtitleKeys: ["genre"],
    onToggle: toggleArtist
  });
}

function renderAlbums() {
  const searchTerm = normalizeText(albumSearchInput?.value || "");

  const filteredAlbums = displayedAlbums.filter((album) => {
    return normalizeText(album.title).includes(searchTerm) ||
      normalizeText(album.artist).includes(searchTerm) ||
      normalizeText(album.genre).includes(searchTerm);
  });

  renderMediaGrid({
    items: filteredAlbums,
    selectedItems: selectedAlbums,
    grid: albumsGrid,
    emptyMessage: emptyAlbumsMessage,
    titleKey: "title",
    subtitleKeys: ["artist", "genre"],
    onToggle: toggleAlbum
  });
}

function renderMediaGrid({ items, selectedItems, grid, emptyMessage, titleKey, subtitleKeys, onToggle }) {
  if (!grid) return;

  grid.innerHTML = "";

  if (items.length === 0) {
    if (emptyMessage) {
      emptyMessage.style.display = "block";
    }
    return;
  }

  if (emptyMessage) {
    emptyMessage.style.display = "none";
  }

  items.forEach((item) => {
    const title = item[titleKey];
    const isSelected = selectedItems.some((selected) => getMediaKey(selected, titleKey) === getMediaKey(item, titleKey));
    const initials = getInitials(title);

    const button = document.createElement("button");
    button.type = "button";
    button.className = isSelected ? "media-card selected" : "media-card";

    const subtitles = subtitleKeys
      .map((key) => item[key])
      .filter(Boolean)
      .join(" • ");

    button.innerHTML = `
      <div class="media-image">
        <div class="media-fallback">${initials}</div>
        ${
          item.image
            ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(title)}" loading="lazy">`
            : ""
        }
      </div>

      <strong>${escapeHTML(title)}</strong>
      <small>${escapeHTML(subtitles)}</small>
    `;

    const img = button.querySelector("img");

    if (img) {
      img.addEventListener("error", () => {
        img.style.display = "none";
        button.classList.add("image-error");
      });

      img.addEventListener("load", () => {
        button.classList.remove("image-error");
        img.style.display = "block";
      });
    }

    button.addEventListener("click", () => {
      onToggle(item);
    });

    grid.appendChild(button);
  });
}

function toggleArtist(artist) {
  const exists = selectedArtists.some((item) => getMediaKey(item, "name") === getMediaKey(artist, "name"));

  if (exists) {
    selectedArtists = selectedArtists.filter((item) => getMediaKey(item, "name") !== getMediaKey(artist, "name"));
  } else {
    selectedArtists.push(artist);
  }

  renderArtists();
  renderSelectedPills({
    selectedItems: selectedArtists,
    preview: selectedArtistsPreview,
    count: selectedArtistsCount,
    titleKey: "name",
    onRemove: removeArtist
  });
}

function toggleAlbum(album) {
  const exists = selectedAlbums.some((item) => getMediaKey(item, "title") === getMediaKey(album, "title"));

  if (exists) {
    selectedAlbums = selectedAlbums.filter((item) => getMediaKey(item, "title") !== getMediaKey(album, "title"));
  } else {
    selectedAlbums.push(album);
  }

  renderAlbums();
  renderSelectedPills({
    selectedItems: selectedAlbums,
    preview: selectedAlbumsPreview,
    count: selectedAlbumsCount,
    titleKey: "title",
    onRemove: removeAlbum
  });
}

function removeArtist(artist) {
  selectedArtists = selectedArtists.filter((item) => getMediaKey(item, "name") !== getMediaKey(artist, "name"));

  renderArtists();
  renderSelectedPills({
    selectedItems: selectedArtists,
    preview: selectedArtistsPreview,
    count: selectedArtistsCount,
    titleKey: "name",
    onRemove: removeArtist
  });
}

function removeAlbum(album) {
  selectedAlbums = selectedAlbums.filter((item) => getMediaKey(item, "title") !== getMediaKey(album, "title"));

  renderAlbums();
  renderSelectedPills({
    selectedItems: selectedAlbums,
    preview: selectedAlbumsPreview,
    count: selectedAlbumsCount,
    titleKey: "title",
    onRemove: removeAlbum
  });
}

function renderSelectedPills({ selectedItems, preview, count, titleKey, onRemove }) {
  if (!preview || !count) return;

  count.textContent =
    selectedItems.length === 1
      ? "1 selecionado"
      : `${selectedItems.length} selecionados`;

  preview.innerHTML = "";

  selectedItems.forEach((item) => {
    const pill = document.createElement("span");
    pill.className = "selected-pill";

    pill.innerHTML = `
      ${item[titleKey]}
      <button type="button" aria-label="Remover ${item[titleKey]}">×</button>
    `;

    const removeBtn = pill.querySelector("button");

    removeBtn.addEventListener("click", () => {
      onRemove(item);
    });

    preview.appendChild(pill);
  });
}

onboardingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  const favoriteGenres = getCheckedValues("favoriteGenres");
  const appGoals = getCheckedValues("appGoals");
  const bio = bioInput?.value.trim() || "";

  const favoriteArtists = selectedArtists.map((artist) => ({
    id: artist.id || "",
    name: artist.name,
    genre: artist.genre,
    image: artist.image || ""
  }));

  const favoriteAlbums = selectedAlbums.map((album) => ({
    id: album.id || "",
    title: album.title,
    artist: album.artist,
    genre: album.genre,
    image: album.image || ""
  }));

  if (favoriteGenres.length === 0) {
    showMessage("Escolha pelo menos um gênero favorito.");
    return;
  }

  if (favoriteArtists.length === 0) {
    showMessage("Escolha pelo menos um artista favorito.");
    return;
  }

  if (favoriteAlbums.length === 0) {
    showMessage("Escolha pelo menos um álbum favorito.");
    return;
  }

  if (appGoals.length === 0) {
    showMessage("Escolha pelo menos um objetivo no Vinyl.");
    return;
  }

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      bio,
      favoriteGenres,
      favoriteArtists,
      favoriteAlbums,
      appGoals,
      spotifyConnected: false,
      onboardingCompleted: true,
      updatedAt: serverTimestamp()
    }, { merge: true });

    showMessage("Perfil finalizado com sucesso!");

    setTimeout(() => {
      window.location.href = "home.html";
    }, 900);
  } catch (error) {
    console.error(error);
    showMessage("Erro ao finalizar onboarding.");
  }
});

skipOnboardingBtn?.addEventListener("click", async () => {
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      onboardingCompleted: true,
      updatedAt: serverTimestamp()
    }, { merge: true });

    window.location.href = "home.html";
  } catch (error) {
    console.error(error);
    showMessage("Não foi possível pular agora.");
  }
});

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map((input) => input.value);
}

async function hydrateDefaultMedia() {
  try {
    const response = await fetch("/api/spotifyOnboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        artists: artists.slice(0, 20).map((artist) => artist.name),
        albums: albums.slice(0, 20).map((album) => `${album.title} ${album.artist}`)
      })
    });

    if (!response.ok) {
      throw new Error(`Spotify onboarding: ${response.status}`);
    }

    const data = await response.json();
    const imageByArtistName = new Map(
      (data.artists || []).map((artist) => [normalizeText(artist.name), artist])
    );
    const imageByAlbumTitle = new Map(
      (data.albums || []).map((album) => [normalizeText(album.title), album])
    );

    if ((artistSearchInput?.value.trim() || "").length < 2) {
      displayedArtists = artists.map((artist) => ({
        ...artist,
        ...(imageByArtistName.get(normalizeText(artist.name)) || {})
      }));
      renderArtists();
    }

    if ((albumSearchInput?.value.trim() || "").length < 2) {
      displayedAlbums = albums.map((album) => ({
        ...album,
        ...(imageByAlbumTitle.get(normalizeText(album.title)) || {})
      }));
      renderAlbums();
    }
  } catch (error) {
    console.error("Erro ao carregar imagens do onboarding:", error);
  }
}

async function searchArtists() {
  const searchTerm = artistSearchInput?.value.trim() || "";

  if (searchTerm.length < 2) {
    displayedArtists = artists;
    hydrateDefaultMedia();
    renderArtists();
    return;
  }

  try {
    const data = await fetchSpotifySearch(searchTerm, "artist");
    const remoteArtists = (data.artists?.items || [])
      .map(normalizeSpotifyArtist)
      .filter((artist) => artist.name);

    displayedArtists = mergeSelectedMedia(remoteArtists, selectedArtists, "name");
    renderArtists();
  } catch (error) {
    console.error("Erro ao buscar artistas:", error);
    displayedArtists = artists;
    renderArtists();
  }
}

async function searchAlbums() {
  const searchTerm = albumSearchInput?.value.trim() || "";

  if (searchTerm.length < 2) {
    displayedAlbums = albums;
    hydrateDefaultMedia();
    renderAlbums();
    return;
  }

  try {
    const data = await fetchSpotifySearch(searchTerm, "album");
    const remoteAlbums = (data.albums?.items || [])
      .map(normalizeSpotifyAlbum)
      .filter((album) => album.title);

    displayedAlbums = mergeSelectedMedia(remoteAlbums, selectedAlbums, "title");
    renderAlbums();
  } catch (error) {
    console.error("Erro ao buscar albuns:", error);
    displayedAlbums = albums;
    renderAlbums();
  }
}

async function fetchSpotifySearch(query, type) {
  const response = await fetch(
    `/api/searchSpotify?query=${encodeURIComponent(query)}&type=${type}`
  );

  if (!response.ok) {
    throw new Error(`Spotify search ${type}: ${response.status}`);
  }

  return response.json();
}

function normalizeSpotifyArtist(artist) {
  return {
    id: artist.id || "",
    name: artist.name || "",
    genre: artist.genres?.slice(0, 2).join(" / ") || "Artista",
    image: artist.images?.[0]?.url || ""
  };
}

function normalizeSpotifyAlbum(album) {
  return {
    id: album.id || "",
    title: album.name || "",
    artist: album.artists?.map((artist) => artist.name).join(", ") || "Artista",
    genre: album.release_date?.slice(0, 4) || "Album",
    image: album.images?.[0]?.url || ""
  };
}

function mergeSelectedMedia(items, selectedItems, titleKey) {
  const nextItems = [...items];

  selectedItems.forEach((selectedItem) => {
    const selectedKey = getMediaKey(selectedItem, titleKey);
    const exists = nextItems.some((item) => getMediaKey(item, titleKey) === selectedKey);

    if (!exists) {
      nextItems.push(selectedItem);
    }
  });

  return nextItems;
}

function getMediaKey(item, titleKey) {
  return item.id || normalizeText(item[titleKey] || "");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

function getInitials(value) {
  return String(value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function showMessage(message) {
  const toast = document.getElementById("toast");

  if (toast) {
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  } else {
    alert(message);
  }
}
