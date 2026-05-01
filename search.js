import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  limit,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   ELEMENTOS
========================= */

const logoutBtn = document.getElementById("logoutBtn");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const navbarLinks = document.getElementById("navbarLinks");
const navbarAvatar = document.getElementById("navbarAvatar");
const navbarUsername = document.getElementById("navbarUsername");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearSearchBtn = document.getElementById("clearSearchBtn");

const searchTabs = document.getElementById("searchTabs");
const genreChips = document.getElementById("genreChips");
const quickSearches = document.getElementById("quickSearches");
const trendingList = document.getElementById("trendingList");
const topGenresList = document.getElementById("topGenresList");

const recentSearchesList = document.getElementById("recentSearchesList");
const clearRecentSearchesBtn = document.getElementById("clearRecentSearchesBtn");

const resultsSubtitle = document.getElementById("resultsSubtitle");
const emptySearchState = document.getElementById("emptySearchState");
const searchLoading = document.getElementById("searchLoading");
const resultsGrid = document.getElementById("resultsGrid");
const exploreTrendingBtn = document.getElementById("exploreTrendingBtn");
const emptyExploreBtn = document.getElementById("emptyExploreBtn");

const itemModal = document.getElementById("itemModal");
const closeItemModalBtn = document.getElementById("closeItemModalBtn");
const closeItemModalBackdrop = document.getElementById("closeItemModalBackdrop");
const modalItemCover = document.getElementById("modalItemCover");
const modalItemType = document.getElementById("modalItemType");
const modalItemTitle = document.getElementById("modalItemTitle");
const modalItemSubtitle = document.getElementById("modalItemSubtitle");
const modalItemDescription = document.getElementById("modalItemDescription");
const modalOpenSpotifyBtn = document.getElementById("modalOpenSpotifyBtn");
const modalFavoriteBtn = document.getElementById("modalFavoriteBtn");
const modalReviewBtn = document.getElementById("modalReviewBtn");
const modalSendChatBtn = document.getElementById("modalSendChatBtn");

const sendChatModal = document.getElementById("sendChatModal");
const closeSendChatBtn = document.getElementById("closeSendChatBtn");
const closeSendChatBackdrop = document.getElementById("closeSendChatBackdrop");
const sendChatPreviewImage = document.getElementById("sendChatPreviewImage");
const sendChatPreviewTitle = document.getElementById("sendChatPreviewTitle");
const sendChatPreviewSubtitle = document.getElementById("sendChatPreviewSubtitle");
const sendChatUserSearch = document.getElementById("sendChatUserSearch");
const sendChatUsersList = document.getElementById("sendChatUsersList");

const toast = document.getElementById("toast");

const DEFAULT_AVATAR = "https://placehold.co/120x120/111111/ff4d6d?text=V";
const DEFAULT_COVER = "https://placehold.co/600x600/111111/ff4d6d?text=VINYL";
const RECENT_KEY = "vinyl_recent_searches";

let currentUser = null;
let currentUserData = null;
let activeType = "all";
let currentResults = [];
let selectedItem = null;

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await loadNavbarUser();
  renderRecentSearches();
});

/* =========================
   NAVBAR
========================= */

async function loadNavbarUser() {
  try {
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));

    currentUserData = userSnap.exists() ? userSnap.data() : {};

    const name =
      currentUserData.username ||
      currentUserData.displayName ||
      currentUser.displayName ||
      "Perfil";

    const avatar =
      currentUserData.photoURL ||
      currentUser.photoURL ||
      DEFAULT_AVATAR;

    if (navbarUsername) navbarUsername.textContent = name;

    if (navbarAvatar) {
      navbarAvatar.src = avatar;
      navbarAvatar.onerror = () => {
        navbarAvatar.src = DEFAULT_AVATAR;
      };
    }
  } catch (error) {
    console.error("Erro ao carregar navbar:", error);
  }
}

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    showToast("Erro ao sair.");
  }
});

mobileMenuBtn?.addEventListener("click", () => {
  navbarLinks?.classList.toggle("show");
});

/* =========================
   EVENTS
========================= */

searchForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const term = searchInput.value.trim();

  if (!term) {
    showToast("Digite algo para buscar.");
    return;
  }

  await performSearch(term);
});

clearSearchBtn?.addEventListener("click", () => {
  searchInput.value = "";
  currentResults = [];

  if (resultsGrid) {
    resultsGrid.innerHTML = "";
    resultsGrid.hidden = true;
  }

  if (emptySearchState) {
    emptySearchState.hidden = false;
  }

  if (resultsSubtitle) {
    resultsSubtitle.textContent = "Pesquise algo para começar.";
  }
});

searchTabs?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-type]");
  if (!button) return;

  document.querySelectorAll("[data-type]").forEach((btn) => {
    btn.classList.remove("active");
  });

  button.classList.add("active");

  activeType = button.dataset.type || "all";

  const term = searchInput.value.trim();

  if (term) {
    await performSearch(term, false);
  }
});

genreChips?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-genre]");
  if (!button) return;

  const genre = button.dataset.genre;

  searchInput.value = genre;
  await performSearch(genre);
});

topGenresList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-genre]");
  if (!button) return;

  const genre = button.dataset.genre;

  searchInput.value = genre;
  await performSearch(genre);
});

quickSearches?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-query]");
  if (!button) return;

  const term = button.dataset.query;

  searchInput.value = term;
  await performSearch(term);
});

trendingList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-query]");
  if (!button) return;

  const term = button.dataset.query;

  searchInput.value = term;
  await performSearch(term);
});

exploreTrendingBtn?.addEventListener("click", () => {
  searchInput.value = "The Weeknd";
  performSearch("The Weeknd");
});

emptyExploreBtn?.addEventListener("click", () => {
  searchInput.value = "The Weeknd";
  performSearch("The Weeknd");
});

/* =========================
   SEARCH CORE
========================= */

async function performSearch(term, saveRecent = true) {
  try {
    setLoading(true);

    if (saveRecent) {
      saveRecentSearch(term);
      renderRecentSearches();
    }

    const [musicResults, userResults] = await Promise.all([
      searchMusic(term),
      shouldSearchUsers() ? searchUsers(term) : Promise.resolve([])
    ]);

    let results = [];

    if (activeType === "users") {
      results = userResults;
    } else if (activeType === "all") {
      results = [...userResults, ...musicResults];
    } else {
      results = musicResults.filter((item) => item.type === activeType);
    }

    currentResults = results;

    renderResults(results, term);
  } catch (error) {
    console.error("Erro na busca:", error);
    showToast("Erro ao buscar. Tente novamente.");
    renderEmptyResults("Não foi possível carregar os resultados.");
  } finally {
    setLoading(false);
  }
}

function shouldSearchUsers() {
  return activeType === "all" || activeType === "users";
}

async function searchMusic(term) {
  if (activeType === "users") return [];

  const types = activeType === "all"
    ? ["track", "album", "artist", "playlist"]
    : [activeType];

  const spotifyResults = await searchSpotifyAPI(term, types);

  if (spotifyResults.length) {
    return spotifyResults;
  }

  return searchITunesFallback(term, types);
}

/*
  API opcional:
  /api/spotifySearch?q=...&type=track,album,artist,playlist

  Se não existir, usa iTunes fallback.
*/
async function searchSpotifyAPI(term, types) {
  try {
    const response = await fetch(
      `/api/spotifySearch?q=${encodeURIComponent(term)}&type=${encodeURIComponent(types.join(","))}`
    );

    if (!response.ok) return [];

    const data = await response.json();

    return normalizeSpotifyResults(data);
  } catch {
    return [];
  }
}

function normalizeSpotifyResults(data) {
  const results = [];

  const tracks = data.tracks?.items || data.tracks || [];
  const albums = data.albums?.items || data.albums || [];
  const artists = data.artists?.items || data.artists || [];
  const playlists = data.playlists?.items || data.playlists || [];

  tracks.forEach((item) => {
    results.push({
      id: item.id || crypto.randomUUID(),
      source: "spotify",
      type: "track",
      title: item.name || "Música",
      subtitle: item.artists?.map((a) => a.name).join(", ") || "Artista",
      description: item.album?.name ? `Álbum: ${item.album.name}` : "Música no Spotify",
      image: item.album?.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || item.url || "",
      raw: item
    });
  });

  albums.forEach((item) => {
    results.push({
      id: item.id || crypto.randomUUID(),
      source: "spotify",
      type: "album",
      title: item.name || "Álbum",
      subtitle: item.artists?.map((a) => a.name).join(", ") || "Artista",
      description: `${item.total_tracks || 0} faixas`,
      image: item.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || item.url || "",
      raw: item
    });
  });

  artists.forEach((item) => {
    results.push({
      id: item.id || crypto.randomUUID(),
      source: "spotify",
      type: "artist",
      title: item.name || "Artista",
      subtitle: item.genres?.slice(0, 2).join(", ") || "Artista",
      description: `${formatNumber(item.followers?.total || 0)} seguidores`,
      image: item.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || item.url || "",
      raw: item
    });
  });

  playlists.forEach((item) => {
    results.push({
      id: item.id || crypto.randomUUID(),
      source: "spotify",
      type: "playlist",
      title: item.name || "Playlist",
      subtitle: item.owner?.display_name || "Spotify",
      description: stripHTML(item.description || "Playlist"),
      image: item.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || item.url || "",
      raw: item
    });
  });

  return results;
}

/**
 * Busca no iTunes com suporte a múltiplos tipos
 * @async
 * @param {string} term - Termo de busca
 * @param {Array<string>} types - Tipos a buscar (track, album, artist, playlist)
 * @returns {Promise<Array>} Resultados normalizados
 */
async function searchITunesFallback(term, types) {
  if (!term?.trim()) return [];

  try {
    const entities = getITunesEntities(types);
    
    if (!entities.length) return [];

    // Fazer requisições paralelas para cada tipo
    const requests = entities.map(entity =>
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=${entity}&limit=20`
      )
    );

    const responses = await Promise.all(requests);
    const results = [];

    for (const response of responses) {
      if (!response.ok) continue;

      const data = await response.json();
      const items = (data.results || [])
        .map((item) => normalizeITunesSearchItem(item))
        .filter(Boolean);

      results.push(...items);
    }

    // Filtrar por tipo ativo se necessário
    if (activeType !== "all") {
      return results.filter((item) => item.type === activeType);
    }

    return results;
  } catch (error) {
    console.error("Fallback iTunes falhou:", error);
    return [];
  }
}

/**
 * Retorna array de entidades iTunes baseado nos tipos solicitados
 * @param {Array<string>} types - Tipos (track, album, artist, playlist)
 * @returns {Array<string>} Entidades iTunes
 */
function getITunesEntities(types) {
  const entities = [];

  if (types.includes("track")) entities.push("song");
  if (types.includes("album")) entities.push("album");
  if (types.includes("artist")) entities.push("musicArtist");

  // playlist não existe no iTunes, então ignoramos

  return entities.length > 0 ? entities : ["song"];
}

function normalizeITunesSearchItem(item) {
  const type = item.wrapperType === "artist"
    ? "artist"
    : item.collectionType === "Album"
      ? "album"
      : "track";

  const id = String(item.trackId || item.collectionId || item.artistId || "");

  if (!id) return null;

  return {
    id,
    source: "itunes",
    type,
    title: item.trackName || item.collectionName || item.artistName || "Resultado",
    subtitle: item.artistName || "Artista",
    description: item.collectionName || item.primaryGenreName || "Catálogo musical",
    image: upgradeITunesImage(item.artworkUrl100) || DEFAULT_COVER,
    url: item.trackViewUrl || item.collectionViewUrl || item.artistViewUrl || "",
    raw: item
  };
}

async function searchUsers(term) {
  const normalized = normalizeText(term);
  const users = [];

  try {
    const usersRef = collection(db, "users");
    const snap = await getDocs(query(usersRef, limit(80)));

    snap.forEach((docSnap) => {
      if (docSnap.id === currentUser?.uid) return;

      const data = docSnap.data();

      const displayName = data.displayName || data.name || "";
      const username = data.username || "";

      const haystack = normalizeText(`${displayName} ${username}`);

      if (!haystack.includes(normalized)) return;

      users.push({
        id: docSnap.id,
        source: "vinyl",
        type: "user",
        title: displayName || username || "Usuário Vinyl",
        subtitle: username ? `@${username}` : "@usuario",
        description: data.bio || "Perfil musical no Vinyl",
        image: data.photoURL || data.avatar || DEFAULT_AVATAR,
        url: `profile.html?uid=${encodeURIComponent(docSnap.id)}`,
        raw: {
          uid: docSnap.id,
          ...data
        }
      });
    });

    return users.slice(0, 12);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }
}

/* =========================
   RENDER RESULTS
========================= */

function renderResults(results, term) {
  if (!resultsGrid || !emptySearchState) return;

  resultsGrid.innerHTML = "";

  if (!results.length) {
    resultsGrid.hidden = true;
    emptySearchState.hidden = false;

    if (resultsSubtitle) {
      resultsSubtitle.textContent = `Nenhum resultado para "${term}".`;
    }

    emptySearchState.innerHTML = `
      <div class="empty-vinyl-icon">?</div>
      <h3>Nada encontrado</h3>
      <p>Tente buscar por música, artista, álbum, playlist ou usuário.</p>
      <button type="button" id="emptyExploreBtnDynamic">Explorar em alta</button>
    `;

    document.getElementById("emptyExploreBtnDynamic")?.addEventListener("click", () => {
      searchInput.value = "The Weeknd";
      performSearch("The Weeknd");
    });

    return;
  }

  if (resultsSubtitle) {
    resultsSubtitle.textContent = `${results.length} resultado${results.length === 1 ? "" : "s"} para "${term}".`;
  }

  emptySearchState.hidden = true;
  resultsGrid.hidden = false;

  results.forEach((item) => {
    resultsGrid.appendChild(createResultCard(item));
  });
}

function renderEmptyResults(message) {
  if (!resultsGrid || !emptySearchState) return;

  resultsGrid.hidden = true;
  emptySearchState.hidden = false;

  emptySearchState.innerHTML = `
    <div class="empty-vinyl-icon">!</div>
    <h3>Ops...</h3>
    <p>${escapeHTML(message)}</p>
  `;
}

function createResultCard(item) {
  const card = document.createElement("article");
  card.className = `result-card result-${item.type}`;

  const typeLabel = getTypeLabel(item.type);

  card.innerHTML = `
    <button type="button" class="result-main" data-action="open">
      <img src="${escapeHTML(item.image || DEFAULT_COVER)}" alt="${escapeHTML(item.title)}">

      <div class="result-info">
        <span>${escapeHTML(typeLabel)}</span>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.subtitle || "")}</p>
        <small>${escapeHTML(item.description || "")}</small>
      </div>
    </button>

    <div class="result-actions">
      ${
        item.type === "user"
          ? `
            <a href="${escapeHTML(item.url)}" class="card-action primary">Ver perfil</a>
          `
          : `
            <a href="${escapeHTML(getDetailsUrl(item))}" class="card-action primary">Detalhes</a>
            <button type="button" class="card-action" data-action="favorite">Favoritar</button>
            <button type="button" class="card-action" data-action="review">Review</button>
            <button type="button" class="card-action" data-action="send">Enviar no chat</button>
          `
      }
    </div>
  `;

  const img = card.querySelector("img");

  img.addEventListener("error", () => {
    img.src = item.type === "user" ? DEFAULT_AVATAR : DEFAULT_COVER;
  });

  card.querySelector('[data-action="open"]')?.addEventListener("click", () => {
    if (item.type === "user") {
      window.location.href = item.url;
      return;
    }

    openItemModal(item);
  });

  card.querySelector('[data-action="favorite"]')?.addEventListener("click", () => {
    favoriteItem(item);
  });

  card.querySelector('[data-action="review"]')?.addEventListener("click", () => {
    openReviewForItem(item);
  });

  card.querySelector('[data-action="send"]')?.addEventListener("click", () => {
    openSendChatModal(item);
  });

  return card;
}

/* =========================
   DETAILS URL
========================= */

function getDetailsUrl(item) {
  const source = item.source || detectItemSource(item.id);

  return `details.html?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}&source=${encodeURIComponent(source)}`;
}

function detectItemSource(id) {
  return /^\d+$/.test(String(id || "")) ? "itunes" : "spotify";
}

/* =========================
   ITEM MODAL
========================= */

function openItemModal(item) {
  selectedItem = item;

  if (!itemModal) return;

  modalItemCover.src = item.image || DEFAULT_COVER;
  modalItemType.textContent = getTypeLabel(item.type);
  modalItemTitle.textContent = item.title;
  modalItemSubtitle.textContent = item.subtitle || "";
  modalItemDescription.textContent = item.description || "Veja detalhes desse item no Vinyl.";

  modalOpenSpotifyBtn.href = item.url || "#";
  modalOpenSpotifyBtn.hidden = !item.url;

  itemModal.hidden = false;
}

function closeItemModal() {
  if (!itemModal) return;
  itemModal.hidden = true;
}

closeItemModalBtn?.addEventListener("click", closeItemModal);
closeItemModalBackdrop?.addEventListener("click", closeItemModal);

modalFavoriteBtn?.addEventListener("click", () => {
  if (!selectedItem) return;
  favoriteItem(selectedItem);
});

modalReviewBtn?.addEventListener("click", () => {
  if (!selectedItem) return;
  openReviewForItem(selectedItem);
});

modalSendChatBtn?.addEventListener("click", () => {
  if (!selectedItem) return;
  openSendChatModal(selectedItem);
});

/* =========================
   FAVORITE / REVIEW
========================= */

async function favoriteItem(item) {
  if (!currentUser || !item) return;

  try {
    const favoriteId = `${item.type}_${item.source || "unknown"}_${item.id}`.replaceAll("/", "_");

    await setDoc(doc(db, "users", currentUser.uid, "favorites", favoriteId), {
      id: item.id,
      source: item.source || detectItemSource(item.id),
      type: item.type,
      title: item.title,
      subtitle: item.subtitle || "",
      description: item.description || "",
      image: item.image || "",
      url: item.url || "",
      createdAt: serverTimestamp()
    }, { merge: true });

    showToast("Adicionado aos favoritos.");
  } catch (error) {
    console.error("Erro ao favoritar:", error);
    showToast("Não foi possível favoritar.");
  }
}

function openReviewForItem(item) {
  const query = encodeURIComponent(item.title);
  const id = encodeURIComponent(item.id);
  const type = encodeURIComponent(item.type);
  const source = encodeURIComponent(item.source || detectItemSource(item.id));

  window.location.href = `timeline.html?review=${query}&itemId=${id}&type=${type}&source=${source}`;
}

/* =========================
   SEND TO CHAT
========================= */

function openSendChatModal(item) {
  selectedItem = item;

  if (!sendChatModal) return;

  sendChatPreviewImage.src = item.image || DEFAULT_COVER;
  sendChatPreviewTitle.textContent = item.title;
  sendChatPreviewSubtitle.textContent = item.subtitle || getTypeLabel(item.type);

  sendChatUsersList.innerHTML = `<p class="muted-text">Busque um usuário para enviar.</p>`;
  sendChatUserSearch.value = "";

  sendChatModal.hidden = false;
  sendChatUserSearch.focus();
}

function closeSendChatModal() {
  if (!sendChatModal) return;
  sendChatModal.hidden = true;
}

closeSendChatBtn?.addEventListener("click", closeSendChatModal);
closeSendChatBackdrop?.addEventListener("click", closeSendChatModal);

sendChatUserSearch?.addEventListener("input", debounce(async () => {
  const term = sendChatUserSearch.value.trim();

  if (!term) {
    sendChatUsersList.innerHTML = `<p class="muted-text">Busque um usuário para enviar.</p>`;
    return;
  }

  const users = await searchUsers(term);
  renderSendChatUsers(users);
}, 350));

function renderSendChatUsers(users) {
  sendChatUsersList.innerHTML = "";

  if (!users.length) {
    sendChatUsersList.innerHTML = `<p class="muted-text">Nenhum usuário encontrado.</p>`;
    return;
  }

  users.forEach((user) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "send-chat-user";

    button.innerHTML = `
      <img src="${escapeHTML(user.image || DEFAULT_AVATAR)}" alt="${escapeHTML(user.title)}">

      <div>
        <strong>${escapeHTML(user.title)}</strong>
        <span>${escapeHTML(user.subtitle)}</span>
      </div>

      <small>Enviar</small>
    `;

    button.addEventListener("click", () => {
      sendItemToUser(user);
    });

    sendChatUsersList.appendChild(button);
  });
}

async function sendItemToUser(user) {
  if (!currentUser || !selectedItem || !user?.id) return;

  try {
    const chatId = createChatId(currentUser.uid, user.id);

    const text = selectedItem.url
      ? `${selectedItem.title} ${selectedItem.url}`
      : selectedItem.title;

    await addDoc(collection(db, "messages"), {
      chatId,
      senderUid: currentUser.uid,
      receiverUid: user.id,
      participants: [currentUser.uid, user.id],
      text,
      type: selectedItem.url ? "link" : "text",
      url: selectedItem.url || "",
      preview: selectedItem.url
        ? {
            provider: selectedItem.source === "itunes" ? "Apple Music / iTunes" : "Spotify",
            title: selectedItem.title,
            description: selectedItem.subtitle || selectedItem.description || "",
            image: selectedItem.image || "",
            url: selectedItem.url,
            icon: "♪"
          }
        : null,
      musicTitle: selectedItem.type === "track" ? selectedItem.title : "",
      musicArtist: selectedItem.subtitle || "",
      replyTo: null,
      reactions: {},
      edited: false,
      editedAt: null,
      read: false,
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    closeSendChatModal();
    showToast("Enviado no chat.");
  } catch (error) {
    console.error("Erro ao enviar no chat:", error);
    showToast("Erro ao enviar no chat.");
  }
}

/* =========================
   RECENT SEARCHES
========================= */

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(term) {
  const clean = term.trim();

  if (!clean) return;

  const recent = getRecentSearches()
    .filter((item) => normalizeText(item) !== normalizeText(clean));

  recent.unshift(clean);

  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
}

function renderRecentSearches() {
  if (!recentSearchesList) return;

  const recent = getRecentSearches();

  recentSearchesList.innerHTML = "";

  if (!recent.length) {
    recentSearchesList.innerHTML = `<p class="muted-text">Nenhuma busca recente ainda.</p>`;
    return;
  }

  recent.forEach((term) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = term;

    button.addEventListener("click", () => {
      searchInput.value = term;
      performSearch(term, false);
    });

    recentSearchesList.appendChild(button);
  });
}

clearRecentSearchesBtn?.addEventListener("click", () => {
  localStorage.removeItem(RECENT_KEY);
  renderRecentSearches();
});

/* =========================
   UTILS
========================= */

function setLoading(isLoading) {
  if (searchBtn) searchBtn.disabled = isLoading;
  if (searchLoading) searchLoading.hidden = !isLoading;

  if (isLoading) {
    if (emptySearchState) emptySearchState.hidden = true;
    if (resultsGrid) resultsGrid.hidden = true;
  }
}

function createChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function getTypeLabel(type) {
  const labels = {
    all: "Tudo",
    user: "Usuário",
    users: "Usuário",
    track: "Música",
    album: "Álbum",
    artist: "Artista",
    playlist: "Playlist"
  };

  return labels[type] || "Item";
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function upgradeITunesImage(url) {
  if (!url) return "";

  return url
    .replace("100x100bb", "600x600bb")
    .replace("100x100", "600x600");
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value || 0);
}

function stripHTML(value) {
  return String(value || "").replace(/<[^>]*>/g, "").trim();
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounce(fn, delay = 300) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

function showToast(message) {
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}