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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   ELEMENTOS
========================= */

const logoutBtn = document.getElementById("logoutBtn");
const navbarAvatar = document.getElementById("navbarAvatar");
const navbarUsername = document.getElementById("navbarUsername");

const detailsLoading = document.getElementById("detailsLoading");
const detailsError = document.getElementById("detailsError");
const detailsContent = document.getElementById("detailsContent");

const detailCover = document.getElementById("detailCover");
const detailType = document.getElementById("detailType");
const detailTitle = document.getElementById("detailTitle");
const detailSubtitle = document.getElementById("detailSubtitle");
const detailDescription = document.getElementById("detailDescription");
const detailMeta = document.getElementById("detailMeta");

const openExternalBtn = document.getElementById("openExternalBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const reviewBtn = document.getElementById("reviewBtn");
const sendChatBtn = document.getElementById("sendChatBtn");

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
const DEFAULT_COVER = "https://placehold.co/800x800/111111/ff4d6d?text=VINYL";

let currentUser = null;
let currentUserData = null;
let currentItem = null;

/* =========================
   PARAMS
========================= */

const params = new URLSearchParams(window.location.search);

const itemType = params.get("type");
const itemId = params.get("id");
const itemSource = params.get("source") || detectSource(itemId);

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
  await loadDetails();
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    showToast("Erro ao sair.");
  }
});

/* =========================
   NAVBAR
========================= */

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

/* =========================
   LOAD DETAILS
========================= */

async function loadDetails() {
  if (!itemType || !itemId) {
    renderError("Detalhes inválidos.");
    return;
  }

  try {
    setLoading(true);

    let data = null;

    if (itemSource === "spotify") {
      data = await fetchSpotifyDetails(itemType, itemId);
    } else {
      data = await fetchITunesDetails(itemType, itemId);
    }

    if (!data) {
      throw new Error("Detalhes não encontrados.");
    }

    currentItem = data;

    renderDetails(data);
  } catch (error) {
    console.error(error);
    renderError("Erro ao carregar detalhes.");
  } finally {
    setLoading(false);
  }
}

function detectSource(id) {
  const value = String(id || "");

  if (/^\d+$/.test(value)) {
    return "itunes";
  }

  return "spotify";
}

async function fetchSpotifyDetails(type, id) {
  const response = await fetch(
    `/api/spotifyDetails?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
  );

  if (!response.ok) {
    throw new Error("Erro ao buscar detalhes no Spotify.");
  }

  const data = await response.json();

  return normalizeSpotifyDetails(data, type, id);
}

async function fetchITunesDetails(type, id) {
  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`
  );

  if (!response.ok) {
    throw new Error("Erro ao buscar detalhes no iTunes.");
  }

  const data = await response.json();

  const item = data.results?.[0];

  if (!item) return null;

  return normalizeITunesDetails(item, type);
}

/* =========================
   NORMALIZE DETAILS
========================= */

function normalizeSpotifyDetails(data, type, id) {
  const item = data.item || data;

  if (type === "track") {
    return {
      id: item.id || id,
      source: "spotify",
      type: "track",
      title: item.name || "Música",
      subtitle: item.artists?.map((artist) => artist.name).join(", ") || "Artista",
      description: item.album?.name ? `Álbum: ${item.album.name}` : "Música no Spotify",
      image: item.album?.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || item.url || "",
      releaseDate: item.album?.release_date || "",
      genre: "",
      popularity: item.popularity || null,
      raw: item
    };
  }

  if (type === "album") {
    return {
      id: item.id || id,
      source: "spotify",
      type: "album",
      title: item.name || "Álbum",
      subtitle: item.artists?.map((artist) => artist.name).join(", ") || "Artista",
      description: `${item.total_tracks || 0} faixas`,
      image: item.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || item.url || "",
      releaseDate: item.release_date || "",
      genre: item.genres?.join(", ") || "",
      popularity: item.popularity || null,
      raw: item
    };
  }

  if (type === "artist") {
    return {
      id: item.id || id,
      source: "spotify",
      type: "artist",
      title: item.name || "Artista",
      subtitle: item.genres?.slice(0, 3).join(", ") || "Artista",
      description: `${formatNumber(item.followers?.total || 0)} seguidores`,
      image: item.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || item.url || "",
      releaseDate: "",
      genre: item.genres?.join(", ") || "",
      popularity: item.popularity || null,
      raw: item
    };
  }

  if (type === "playlist") {
    return {
      id: item.id || id,
      source: "spotify",
      type: "playlist",
      title: item.name || "Playlist",
      subtitle: item.owner?.display_name || "Spotify",
      description: stripHTML(item.description || "Playlist"),
      image: item.images?.[0]?.url || DEFAULT_COVER,
      url: item.external_urls?.spotify || item.url || "",
      releaseDate: "",
      genre: "",
      popularity: null,
      raw: item
    };
  }

  return {
    id,
    source: "spotify",
    type,
    title: item.name || "Item",
    subtitle: "Spotify",
    description: "",
    image: DEFAULT_COVER,
    url: item.external_urls?.spotify || "",
    raw: item
  };
}

function normalizeITunesDetails(item, typeFromUrl) {
  const type = item.wrapperType === "artist"
    ? "artist"
    : item.collectionType === "Album"
      ? "album"
      : typeFromUrl || "track";

  return {
    id: String(item.trackId || item.collectionId || item.artistId || ""),
    source: "itunes",
    type,
    title: item.trackName || item.collectionName || item.artistName || "Sem título",
    subtitle: item.artistName || "",
    description: item.collectionName || item.primaryGenreName || "Catálogo musical",
    image: upgradeITunesImage(item.artworkUrl100) || DEFAULT_COVER,
    url: item.trackViewUrl || item.collectionViewUrl || item.artistViewUrl || "",
    releaseDate: item.releaseDate || "",
    genre: item.primaryGenreName || "",
    popularity: null,
    raw: item
  };
}

/* =========================
   RENDER
========================= */

function renderDetails(item) {
  if (detailsContent) detailsContent.hidden = false;
  if (detailsError) detailsError.hidden = true;

  if (detailCover) {
    detailCover.src = item.image || DEFAULT_COVER;
    detailCover.onerror = () => {
      detailCover.src = DEFAULT_COVER;
    };
  }

  if (detailType) detailType.textContent = getTypeLabel(item.type);
  if (detailTitle) detailTitle.textContent = item.title || "Sem título";
  if (detailSubtitle) detailSubtitle.textContent = item.subtitle || "";
  if (detailDescription) detailDescription.textContent = item.description || "Sem descrição disponível.";

  if (detailMeta) {
    detailMeta.innerHTML = "";

    const metaItems = [
      item.source ? `Fonte: ${item.source === "itunes" ? "iTunes" : "Spotify"}` : "",
      item.genre ? `Gênero: ${item.genre}` : "",
      item.releaseDate ? `Lançamento: ${formatDate(item.releaseDate)}` : "",
      item.popularity !== null && item.popularity !== undefined ? `Popularidade: ${item.popularity}` : ""
    ].filter(Boolean);

    metaItems.forEach((meta) => {
      const span = document.createElement("span");
      span.textContent = meta;
      detailMeta.appendChild(span);
    });
  }

  if (openExternalBtn) {
    openExternalBtn.href = item.url || "#";
    openExternalBtn.hidden = !item.url;
    openExternalBtn.textContent = item.source === "itunes" ? "Abrir no iTunes" : "Abrir no Spotify";
  }
}

function renderError(message) {
  if (detailsContent) detailsContent.hidden = true;

  if (detailsError) {
    detailsError.hidden = false;
    detailsError.innerHTML = `
      <div class="empty-vinyl-icon">!</div>
      <h2>Ops...</h2>
      <p>${escapeHTML(message)}</p>
      <a href="search.html">Voltar ao catálogo</a>
    `;
  }
}

function setLoading(isLoading) {
  if (detailsLoading) detailsLoading.hidden = !isLoading;

  if (isLoading) {
    if (detailsContent) detailsContent.hidden = true;
    if (detailsError) detailsError.hidden = true;
  }
}

/* =========================
   ACTIONS
========================= */

favoriteBtn?.addEventListener("click", () => {
  if (!currentItem) return;
  favoriteItem(currentItem);
});

reviewBtn?.addEventListener("click", () => {
  if (!currentItem) return;
  openReviewForItem(currentItem);
});

sendChatBtn?.addEventListener("click", () => {
  if (!currentItem) return;
  openSendChatModal(currentItem);
});

async function favoriteItem(item) {
  if (!currentUser || !item) return;

  try {
    const favoriteId = `${item.type}_${item.source || "unknown"}_${item.id}`.replaceAll("/", "_");

    await setDoc(doc(db, "users", currentUser.uid, "favorites", favoriteId), {
      id: item.id,
      source: item.source || detectSource(item.id),
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
  const source = encodeURIComponent(item.source || detectSource(item.id));

  window.location.href = `timeline.html?review=${query}&itemId=${id}&type=${type}&source=${source}`;
}

/* =========================
   SEND TO CHAT
========================= */

function openSendChatModal(item) {
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

async function searchUsers(term) {
  const normalized = normalizeText(term);
  const users = [];

  try {
    const usersRef = collection(db, "users");
    const snap = await getDocs(collection(db, "users"));

    snap.forEach((docSnap) => {
      if (docSnap.id === currentUser?.uid) return;

      const data = docSnap.data();

      const displayName = data.displayName || data.name || "";
      const username = data.username || "";
      const haystack = normalizeText(`${displayName} ${username}`);

      if (!haystack.includes(normalized)) return;

      users.push({
        id: docSnap.id,
        title: displayName || username || "Usuário Vinyl",
        subtitle: username ? `@${username}` : "@usuario",
        image: data.photoURL || data.avatar || DEFAULT_AVATAR
      });
    });

    return users.slice(0, 12);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }
}

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
  if (!currentUser || !currentItem || !user?.id) return;

  try {
    const chatId = createChatId(currentUser.uid, user.id);

    const text = currentItem.url
      ? `${currentItem.title} ${currentItem.url}`
      : currentItem.title;

    await addDoc(collection(db, "messages"), {
      chatId,
      senderUid: currentUser.uid,
      receiverUid: user.id,
      participants: [currentUser.uid, user.id],
      text,
      type: currentItem.url ? "link" : "text",
      url: currentItem.url || "",
      preview: currentItem.url
        ? {
            provider: currentItem.source === "itunes" ? "Apple Music / iTunes" : "Spotify",
            title: currentItem.title,
            description: currentItem.subtitle || currentItem.description || "",
            image: currentItem.image || "",
            url: currentItem.url,
            icon: "♪"
          }
        : null,
      musicTitle: currentItem.type === "track" ? currentItem.title : "",
      musicArtist: currentItem.subtitle || "",
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
   UTILS
========================= */

function createChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
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

function upgradeITunesImage(url) {
  if (!url) return "";

  return url
    .replace("100x100bb", "800x800bb")
    .replace("100x100", "800x800");
}

function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
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