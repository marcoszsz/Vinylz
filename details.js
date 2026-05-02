import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  query,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const navbarLinks = document.getElementById("navbarLinks");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const logoutBtn = document.getElementById("logoutBtn");
const navbarAvatar = document.getElementById("navbarAvatar");
const navbarUsername = document.getElementById("navbarUsername");

const loadingState = document.getElementById("loadingState");
const detailsHero = document.getElementById("detailsHero");
const emptyState = document.getElementById("emptyState");
const insightsGrid = document.getElementById("insightsGrid");

const heroBg = document.getElementById("heroBg");
const itemCover = document.getElementById("itemCover");
const sourcePill = document.getElementById("sourcePill");
const itemType = document.getElementById("itemType");
const itemSource = document.getElementById("itemSource");
const itemTitle = document.getElementById("itemTitle");
const itemSubtitle = document.getElementById("itemSubtitle");
const itemDescription = document.getElementById("itemDescription");

const metaSource = document.getElementById("metaSource");
const metaGenre = document.getElementById("metaGenre");
const metaRelease = document.getElementById("metaRelease");
const metaPopularity = document.getElementById("metaPopularity");
const insightMood = document.getElementById("insightMood");

const favoriteBtn = document.getElementById("favoriteBtn");
const reviewBtn = document.getElementById("reviewBtn");
const openExternalBtn = document.getElementById("openExternalBtn");
const sendChatBtn = document.getElementById("sendChatBtn");
const shareBtn = document.getElementById("shareBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");

const relatedSection = document.getElementById("relatedSection");
const relatedTitle = document.getElementById("relatedTitle");
const relatedSubtitle = document.getElementById("relatedSubtitle");
const relatedGrid = document.getElementById("relatedGrid");

const reviewModal = document.getElementById("reviewModal");
const closeReviewBackdrop = document.getElementById("closeReviewBackdrop");
const closeReviewBtn = document.getElementById("closeReviewBtn");
const reviewPreviewImage = document.getElementById("reviewPreviewImage");
const reviewPreviewTitle = document.getElementById("reviewPreviewTitle");
const reviewPreviewSubtitle = document.getElementById("reviewPreviewSubtitle");
const reviewForm = document.getElementById("reviewForm");
const ratingInput = document.getElementById("ratingInput");
const reviewText = document.getElementById("reviewText");

const sendChatModal = document.getElementById("sendChatModal");
const closeSendChatBackdrop = document.getElementById("closeSendChatBackdrop");
const closeSendChatBtn = document.getElementById("closeSendChatBtn");
const sendPreviewImage = document.getElementById("sendPreviewImage");
const sendPreviewTitle = document.getElementById("sendPreviewTitle");
const sendPreviewSubtitle = document.getElementById("sendPreviewSubtitle");
const sendUserSearch = document.getElementById("sendUserSearch");
const sendUsersList = document.getElementById("sendUsersList");

const toast = document.getElementById("toast");

const DEFAULT_AVATAR = "https://placehold.co/120x120/111111/ff4d6d?text=V";
const DEFAULT_COVER = "https://placehold.co/800x800/111111/ff4d6d?text=VINYL";

let currentUser = null;
let currentUserData = null;
let currentItem = null;

const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");
const itemTypeParam = params.get("type") || "track";
const itemSourceParam = params.get("source") || "spotify";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await loadNavbarUser();
  await loadDetails();
});

mobileMenuBtn?.addEventListener("click", () => {
  navbarLinks?.classList.toggle("open");
  navbarLinks?.classList.toggle("show");
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch {
    showToast("Erro ao sair.");
  }
});

async function loadNavbarUser() {
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));

    currentUserData = snap.exists() ? snap.data() : {};

    const name =
      currentUserData.username ||
      currentUserData.displayName ||
      currentUser.displayName ||
      "Perfil";

    const avatar =
      currentUserData.photoURL ||
      currentUserData.avatar ||
      currentUser.photoURL ||
      DEFAULT_AVATAR;

    navbarUsername.textContent = name;
    navbarAvatar.src = avatar;
    navbarAvatar.onerror = () => {
      navbarAvatar.src = DEFAULT_AVATAR;
    };
  } catch {
    navbarAvatar.src = DEFAULT_AVATAR;
  }
}

async function loadDetails() {
  if (!itemId) {
    showEmpty();
    return;
  }

  showLoading(true);

  try {
    let item = null;

    if (itemSourceParam === "itunes") {
      item = await fetchITunesDetails(itemId, itemTypeParam);
    } else {
      item = await fetchSpotifyDetails(itemId, itemTypeParam);
    }

    if (!item) {
      item = await getCachedMusicItem();
    }

    if (!item) {
      showEmpty();
      return;
    }

    currentItem = item;

    renderDetails(item);
    await checkFavoriteState();
    await loadRelated(item);
  } catch (error) {
    console.error("Erro ao carregar detalhes:", error);
    showEmpty();
  } finally {
    showLoading(false);
  }
}

async function fetchSpotifyDetails(id, type) {
  try {
    const response = await fetch(`/api/spotifyDetails?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);

    if (!response.ok) return null;

    const data = await response.json();

    return normalizeSpotifyItem(data, type);
  } catch {
    return null;
  }
}

async function fetchITunesDetails(id, type) {
  try {
    const response = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song`);

    if (!response.ok) return null;

    const data = await response.json();
    const item = data.results?.[0];

    if (!item) return null;

    return normalizeITunesItem(item, type);
  } catch {
    return null;
  }
}

async function getCachedMusicItem() {
  try {
    const cacheId = `${itemTypeParam}_${itemSourceParam}_${itemId}`.replaceAll("/", "_");
    const snap = await getDoc(doc(db, "musicItems", cacheId));

    if (!snap.exists()) return null;

    return snap.data();
  } catch {
    return null;
  }
}

function normalizeSpotifyItem(data, type) {
  const item = data.item || data;

  if (!item) return null;

  if (type === "track") {
    return {
      id: item.id,
      source: "spotify",
      type: "track",
      title: item.name || "Música",
      subtitle: item.artists?.map((a) => a.name).join(", ") || "Artista",
      description: item.album?.name ? `Álbum: ${item.album.name}` : "Música no Spotify",
      image: item.album?.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || "",
      genre: item.genres?.[0] || "Música",
      releaseDate: item.album?.release_date || "",
      popularity: item.popularity ? `${item.popularity}/100` : "—",
      album: item.album?.name || "",
      artistName: item.artists?.[0]?.name || ""
    };
  }

  if (type === "album") {
    return {
      id: item.id,
      source: "spotify",
      type: "album",
      title: item.name || "Álbum",
      subtitle: item.artists?.map((a) => a.name).join(", ") || "Artista",
      description: `${item.total_tracks || 0} faixas`,
      image: item.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || "",
      genre: item.genres?.[0] || "Álbum",
      releaseDate: item.release_date || "",
      popularity: item.popularity ? `${item.popularity}/100` : "—",
      album: item.name || "",
      artistName: item.artists?.[0]?.name || ""
    };
  }

  if (type === "artist") {
    return {
      id: item.id,
      source: "spotify",
      type: "artist",
      title: item.name || "Artista",
      subtitle: item.genres?.slice(0, 2).join(", ") || "Artista",
      description: `${formatNumber(item.followers?.total || 0)} seguidores no Spotify`,
      image: item.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || "",
      genre: item.genres?.[0] || "Artista",
      releaseDate: "—",
      popularity: item.popularity ? `${item.popularity}/100` : "—",
      artistName: item.name || ""
    };
  }

  return null;
}

function normalizeITunesItem(item, forcedType) {
  const type = forcedType || (
    item.wrapperType === "artist"
      ? "artist"
      : item.collectionType === "Album"
        ? "album"
        : "track"
  );

  return {
    id: String(item.trackId || item.collectionId || item.artistId || itemId),
    source: "itunes",
    type,
    title: item.trackName || item.collectionName || item.artistName || "Resultado",
    subtitle: item.artistName || "Artista",
    description: [
      item.collectionName ? `Álbum: ${item.collectionName}` : "",
      item.primaryGenreName ? `Gênero: ${item.primaryGenreName}` : ""
    ].filter(Boolean).join(" • ") || "Catálogo musical",
    image: upgradeITunesImage(item.artworkUrl100) || DEFAULT_COVER,
    url: item.trackViewUrl || item.collectionViewUrl || item.artistViewUrl || "",
    genre: item.primaryGenreName || "—",
    releaseDate: formatReleaseDate(item.releaseDate),
    popularity: "—",
    album: item.collectionName || "",
    artistName: item.artistName || ""
  };
}

function renderDetails(item) {
  detailsHero.hidden = false;
  insightsGrid.hidden = false;

  const sourceLabel = item.source === "itunes" ? "Apple Music" : "Spotify";
  const typeLabel = getTypeLabel(item.type);

  itemCover.src = item.image || DEFAULT_COVER;
  itemCover.onerror = () => {
    itemCover.src = DEFAULT_COVER;
  };

  heroBg.style.backgroundImage = `url("${item.image || DEFAULT_COVER}")`;

  sourcePill.textContent = sourceLabel;
  itemType.textContent = typeLabel;
  itemSource.textContent = sourceLabel;
  itemTitle.textContent = item.title;
  itemSubtitle.textContent = item.subtitle || "";
  itemDescription.textContent = item.description || "Informações do catálogo musical.";

  metaSource.textContent = sourceLabel;
  metaGenre.textContent = item.genre || "—";
  metaRelease.textContent = item.releaseDate || "—";
  metaPopularity.textContent = item.popularity || "—";

  insightMood.textContent = getMoodText(item);

  openExternalBtn.textContent = item.source === "itunes" ? "Abrir na App Store" : "Abrir no Spotify";
  openExternalBtn.href = item.url || "#";
  openExternalBtn.hidden = !item.url;

  document.title = `Vinyl — ${item.title}`;
}

function getMoodText(item) {
  const genre = String(item.genre || "").toLowerCase();

  if (genre.includes("hip")) return "Vibe rap/trap";
  if (genre.includes("r&b")) return "Vibe R&B";
  if (genre.includes("pop")) return "Pop mood";
  if (genre.includes("rock")) return "Energia rock";
  if (genre.includes("jazz")) return "Clima jazz";

  return item.type === "artist" ? "Perfil de artista" : "Descoberta musical";
}

async function checkFavoriteState() {
  if (!currentItem || !currentUser) return;

  try {
    const favoriteId = getFavoriteId(currentItem);
    const snap = await getDoc(doc(db, "users", currentUser.uid, "favorites", favoriteId));

    if (snap.exists()) {
      favoriteBtn.classList.add("is-favorite");
      favoriteBtn.textContent = "✓ Favoritado";
    } else {
      favoriteBtn.classList.remove("is-favorite");
      favoriteBtn.textContent = "♡ Favoritar";
    }
  } catch {
    favoriteBtn.textContent = "♡ Favoritar";
  }
}

favoriteBtn?.addEventListener("click", async () => {
  if (!currentItem || !currentUser) return;

  try {
    const favoriteId = getFavoriteId(currentItem);

    await setDoc(doc(db, "users", currentUser.uid, "favorites", favoriteId), {
      id: currentItem.id,
      source: currentItem.source,
      type: currentItem.type,
      title: currentItem.title,
      subtitle: currentItem.subtitle || "",
      description: currentItem.description || "",
      image: currentItem.image || "",
      url: currentItem.url || "",
      createdAt: serverTimestamp()
    }, { merge: true });

    favoriteBtn.classList.add("is-favorite");
    favoriteBtn.textContent = "✓ Favoritado";

    showToast("Adicionado aos favoritos.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível favoritar.");
  }
});

reviewBtn?.addEventListener("click", () => {
  if (!currentItem) return;

  reviewPreviewImage.src = currentItem.image || DEFAULT_COVER;
  reviewPreviewTitle.textContent = currentItem.title;
  reviewPreviewSubtitle.textContent = currentItem.subtitle || getTypeLabel(currentItem.type);
  reviewText.value = "";

  reviewModal.hidden = false;
});

closeReviewBtn?.addEventListener("click", closeReviewModal);
closeReviewBackdrop?.addEventListener("click", closeReviewModal);

function closeReviewModal() {
  reviewModal.hidden = true;
}

reviewForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentItem || !currentUser) return;

  const text = reviewText.value.trim();
  const rating = Number(ratingInput.value || 5);

  if (!text) {
    showToast("Escreva um texto para a review.");
    return;
  }

  try {
    await addDoc(collection(db, "reviews"), {
      userId: currentUser.uid,
      userName: currentUserData?.displayName || currentUserData?.username || currentUser.displayName || "Usuário",
      userAvatar: currentUserData?.photoURL || currentUser.photoURL || DEFAULT_AVATAR,
      itemId: currentItem.id,
      itemType: currentItem.type,
      source: currentItem.source,
      title: currentItem.title,
      subtitle: currentItem.subtitle || "",
      cover: currentItem.image || "",
      rating,
      text,
      likesCount: 0,
      createdAt: serverTimestamp()
    });

    closeReviewModal();
    showToast("Review publicada.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível publicar a review.");
  }
});

sendChatBtn?.addEventListener("click", () => {
  if (!currentItem) return;

  sendPreviewImage.src = currentItem.image || DEFAULT_COVER;
  sendPreviewTitle.textContent = currentItem.title;
  sendPreviewSubtitle.textContent = currentItem.subtitle || getTypeLabel(currentItem.type);
  sendUserSearch.value = "";
  sendUsersList.innerHTML = `<p class="muted-text">Busque um usuário para enviar.</p>`;

  sendChatModal.hidden = false;
  sendUserSearch.focus();
});

closeSendChatBtn?.addEventListener("click", closeSendChatModal);
closeSendChatBackdrop?.addEventListener("click", closeSendChatModal);

function closeSendChatModal() {
  sendChatModal.hidden = true;
}

sendUserSearch?.addEventListener("input", debounce(async () => {
  const term = sendUserSearch.value.trim();

  if (!term) {
    sendUsersList.innerHTML = `<p class="muted-text">Busque um usuário para enviar.</p>`;
    return;
  }

  const users = await searchUsers(term);
  renderSendUsers(users);
}, 350));

async function searchUsers(term) {
  const normalized = normalizeText(term);
  const users = [];

  try {
    const snap = await getDocs(query(collection(db, "users"), limit(80)));

    snap.forEach((docSnap) => {
      if (docSnap.id === currentUser.uid) return;

      const data = docSnap.data();

      const displayName = data.displayName || data.name || "";
      const username = data.username || "";

      const haystack = normalizeText(`${displayName} ${username}`);

      if (!haystack.includes(normalized)) return;

      users.push({
        id: docSnap.id,
        displayName: displayName || username || "Usuário",
        username: username || "usuario",
        photoURL: data.photoURL || data.avatar || DEFAULT_AVATAR
      });
    });

    return users.slice(0, 10);
  } catch {
    return [];
  }
}

function renderSendUsers(users) {
  if (!users.length) {
    sendUsersList.innerHTML = `<p class="muted-text">Nenhum usuário encontrado.</p>`;
    return;
  }

  sendUsersList.innerHTML = users.map((user) => `
    <button type="button" class="send-user" data-uid="${escapeHTML(user.id)}">
      <img src="${escapeHTML(user.photoURL)}" alt="${escapeHTML(user.displayName)}">

      <div>
        <strong>${escapeHTML(user.displayName)}</strong>
        <span>@${escapeHTML(user.username)}</span>
      </div>

      <small>Enviar</small>
    </button>
  `).join("");

  document.querySelectorAll(".send-user").forEach((button) => {
    button.addEventListener("click", () => {
      const uid = button.dataset.uid;
      const user = users.find((item) => item.id === uid);

      if (user) {
        sendItemToUser(user);
      }
    });
  });
}

async function sendItemToUser(user) {
  if (!currentItem || !currentUser) return;

  try {
    const chatId = [currentUser.uid, user.id].sort().join("_");

    await addDoc(collection(db, "messages"), {
      chatId,
      senderUid: currentUser.uid,
      receiverUid: user.id,
      participants: [currentUser.uid, user.id],
      text: currentItem.url ? `${currentItem.title} ${currentItem.url}` : currentItem.title,
      type: currentItem.url ? "link" : "text",
      url: currentItem.url || "",
      preview: {
        provider: currentItem.source === "itunes" ? "Apple Music / iTunes" : "Spotify",
        title: currentItem.title,
        description: currentItem.subtitle || currentItem.description || "",
        image: currentItem.image || "",
        url: currentItem.url || "",
        icon: "♪"
      },
      musicTitle: currentItem.type === "track" ? currentItem.title : "",
      musicArtist: currentItem.subtitle || "",
      read: false,
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    closeSendChatModal();
    showToast("Enviado no chat.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível enviar.");
  }
}

shareBtn?.addEventListener("click", async () => {
  if (!currentItem) return;

  const url = window.location.href;

  try {
    if (navigator.share) {
      await navigator.share({
        title: `Vinyl — ${currentItem.title}`,
        text: `Olha isso no Vinyl: ${currentItem.title}`,
        url
      });
    } else {
      await navigator.clipboard.writeText(url);
      showToast("Link copiado.");
    }
  } catch {
    showToast("Compartilhamento cancelado.");
  }
});

copyLinkBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast("Link copiado.");
  } catch {
    showToast("Não foi possível copiar.");
  }
});

async function loadRelated(item) {
  const term = item.artistName || item.subtitle || item.title;

  if (!term) {
    relatedSection.hidden = true;
    return;
  }

  try {
    const related = await searchRelated(term, item.type);

    if (!related.length) {
      relatedSection.hidden = true;
      return;
    }

    relatedTitle.textContent = item.type === "artist" ? "Top músicas" : "Relacionados";
    relatedSubtitle.textContent = `Mais resultados para ${term}.`;

    relatedGrid.innerHTML = related.slice(0, 8).map((relatedItem) => `
      <a class="related-card" href="details.html?type=${encodeURIComponent(relatedItem.type)}&id=${encodeURIComponent(relatedItem.id)}&source=${encodeURIComponent(relatedItem.source)}">
        <img src="${escapeHTML(relatedItem.image || DEFAULT_COVER)}" alt="${escapeHTML(relatedItem.title)}">

        <div>
          <span>${escapeHTML(getTypeLabel(relatedItem.type))}</span>
          <strong>${escapeHTML(relatedItem.title)}</strong>
          <p>${escapeHTML(relatedItem.subtitle || "")}</p>
        </div>
      </a>
    `).join("");

    relatedSection.hidden = false;
  } catch {
    relatedSection.hidden = true;
  }
}

async function searchRelated(term, currentType) {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=12`
    );

    if (!response.ok) return [];

    const data = await response.json();

    return (data.results || [])
      .map((item) => ({
        id: String(item.trackId || item.collectionId || ""),
        source: "itunes",
        type: "track",
        title: item.trackName || item.collectionName || "Música",
        subtitle: item.artistName || "",
        image: upgradeITunesImage(item.artworkUrl100) || DEFAULT_COVER
      }))
      .filter((item) => item.id && item.id !== currentItem.id);
  } catch {
    return [];
  }
}

function getFavoriteId(item) {
  return `${item.type}_${item.source || "unknown"}_${item.id}`.replaceAll("/", "_");
}

function showLoading(isLoading) {
  loadingState.hidden = !isLoading;
}

function showEmpty() {
  loadingState.hidden = true;
  detailsHero.hidden = true;
  insightsGrid.hidden = true;
  relatedSection.hidden = true;
  emptyState.hidden = false;
}

function getTypeLabel(type) {
  const labels = {
    track: "Música",
    album: "Álbum",
    artist: "Artista",
    playlist: "Playlist"
  };

  return labels[type] || "Item";
}

function formatReleaseDate(date) {
  if (!date) return "—";

  try {
    return new Date(date).toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
}

function upgradeITunesImage(url) {
  if (!url) return "";

  return url
    .replace("100x100bb", "800x800bb")
    .replace("100x100", "800x800");
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value || 0);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}