import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   ELEMENTOS DO DOM
========================= */

/**
 * Elementos de navegação e autenticação
 */
const logoutBtn = document.getElementById("logoutBtn");
const navbarAvatar = document.getElementById("navbarAvatar");
const navbarUsername = document.getElementById("navbarUsername");

const detailsLoading = document.getElementById("detailsLoading");
const detailsError = document.getElementById("detailsError");
const detailsContent = document.getElementById("detailsContent");

const detailsImage = document.getElementById("detailsImage");
const detailsType = document.getElementById("detailsType");
const detailsTitle = document.getElementById("detailsTitle");
const artistBiography = document.getElementById("artistBiography");
const detailsMeta = document.getElementById("detailsMeta");
const topTracks = document.getElementById("topTracks");
const discography = document.getElementById("discography");
const relatedArtists = document.getElementById("relatedArtists");
const publicReviews = document.getElementById("publicReviews");

const favoriteDetailBtn = document.getElementById("favoriteDetailBtn");
const hideArtistBtn = document.getElementById("hideArtistBtn");
const reviewLink = document.getElementById("reviewLink");
const spotifyLink = document.getElementById("spotifyLink");



const sendChatModal = document.getElementById("sendChatModal");
const closeSendChatBtn = document.getElementById("closeSendChatBtn");
const closeSendChatBackdrop = document.getElementById("closeSendChatBackdrop");
const sendChatPreviewImage = document.getElementById("sendChatPreviewImage");
const sendChatPreviewTitle = document.getElementById("sendChatPreviewTitle");
const sendChatPreviewSubtitle = document.getElementById("sendChatPreviewSubtitle");
const sendChatUserSearch = document.getElementById("sendChatUserSearch");
const sendChatUsersList = document.getElementById("sendChatUsersList");

const toast = document.getElementById("toast");

/**
 * Constantes de configuração
 */
const DEFAULT_AVATAR = "https://placehold.co/120x120/111111/ff4d6d?text=V";
const DEFAULT_COVER = "https://placehold.co/800x800/111111/ff4d6d?text=VINYL";
const DEBOUNCE_DELAY = 350;
const MAX_SEARCH_RESULTS = 12;
const TOAST_DURATION = 2600;

/**
 * Estado da aplicação
 */
let currentUser = null;
let currentUserData = null;
let currentItem = null;
let userSearchCache = new Map();

/* =========================
   PARAMS
========================= */

const params = new URLSearchParams(window.location.search);

const itemType = params.get("type");
const itemId = params.get("id");
const itemSource = (params.get("source") || detectSource(itemId)).toLowerCase();

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

/**
 * Carrega dados do usuário para a barra de navegação
 * @async
 */
async function loadNavbarUser() {
  if (!currentUser?.uid) return;

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
   CARREGAMENTO DE DETALHES
========================= */

/**
 * Carrega detalhes do item (artista, álbum, música ou playlist)
 * @async
 */
async function loadDetails() {
  if (!itemType || !itemId) {
    console.error("loadDetails: itemType ou itemId inválidos", { itemType, itemId });
    renderError("Detalhes inválidos.");
    return;
  }

  console.log("loadDetails: Iniciando carregamento", { itemType, itemId, itemSource });

  try {
    setLoading(true);

    let data = null;

    if (itemSource === "spotify") {
      console.log("loadDetails: Buscando no Spotify");
      data = await fetchSpotifyDetails(itemType, itemId);
    } else {
      console.log("loadDetails: Buscando no iTunes");
      data = await fetchITunesDetails(itemType, itemId);
    }

    if (!data) {
      console.error("loadDetails: Dados não encontrados");
      throw new Error("Detalhes não encontrados.");
    }

    console.log("loadDetails: Dados carregados com sucesso", data);

    currentItem = data;

    renderDetails(data);
  } catch (error) {
    console.error("loadDetails: Erro ao carregar detalhes", error);
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

/**
 * Busca detalhes no Spotify
 * @async
 * @param {string} type - Tipo do item (track, album, artist, playlist)
 * @param {string} id - ID do item no Spotify
 * @returns {Promise<Object>} Dados normalizados do item
 */
async function fetchSpotifyDetails(type, id) {
  if (!type || !id) throw new Error("Tipo ou ID inválido.");

  try {
    const response = await fetch(
      `/api/spotifyDetails?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      throw new Error("Erro ao buscar detalhes no Spotify.");
    }

    const data = await response.json();
    return normalizeSpotifyDetails(data, type, id);
  } catch (error) {
    console.error("Erro ao buscar Spotify:", error);
    throw error;
  }
}

/**
 * Busca detalhes no iTunes/Apple Music
 * @async
 * @param {string} type - Tipo do item
 * @param {string} id - ID do item no iTunes
 * @returns {Promise<Object|null>} Dados normalizados do item
 */
async function fetchITunesDetails(type, id) {
  if (!id) throw new Error("ID inválido.");

  console.log("fetchITunesDetails: Iniciando busca", { type, id });

  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      throw new Error("Erro ao buscar detalhes no iTunes.");
    }

    const data = await response.json();
    const item = data.results?.[0];

    if (!item) {
      console.error("fetchITunesDetails: Nenhum item encontrado nos resultados", data);
      return null;
    }

    const normalized = normalizeITunesDetails(item, type);
    console.log("fetchITunesDetails: Dados normalizados", normalized);
    return normalized;
  } catch (error) {
    console.error("Erro ao buscar iTunes:", error);
    throw error;
  }
}

/* =========================
   NORMALIZAÇÃO DE DETALHES
========================= */

/**
 * Normaliza dados do Spotify para formato padrão
 * @param {Object} data - Dados brutos do Spotify
 * @param {string} type - Tipo do item
 * @param {string} id - ID do item
 * @returns {Object} Objeto normalizado
 */
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

/**
 * Normaliza dados do iTunes para formato padrão
 * @param {Object} item - Item do iTunes
 * @param {string} typeFromUrl - Tipo passado na URL
 * @returns {Object} Objeto normalizado
 */
function normalizeITunesDetails(item, typeFromUrl) {
  if (!item) return null;

  const type = item.wrapperType === "artist"
    ? "artist"
    : item.collectionType === "Album"
      ? "album"
      : typeFromUrl || "track";

  // Construir descrição melhorada baseado no tipo
  let description = "";
  
  if (type === "track") {
    const parts = [];
    if (item.collectionName) parts.push(`Álbum: ${item.collectionName}`);
    if (item.primaryGenreName) parts.push(`Gênero: ${item.primaryGenreName}`);
    description = parts.length > 0 ? parts.join(" • ") : "Música no iTunes";
  } else if (type === "album") {
    const parts = [];
    if (item.trackCount) parts.push(`${item.trackCount} faixas`);
    if (item.primaryGenreName) parts.push(`Gênero: ${item.primaryGenreName}`);
    description = parts.length > 0 ? parts.join(" • ") : "Álbum no iTunes";
  } else if (type === "artist") {
    if (item.primaryGenreName) {
      description = `Gênero: ${item.primaryGenreName}`;
    } else {
      description = "Artista no iTunes";
    }
  } else {
    description = item.primaryGenreName || "Catálogo musical";
  }

  return {
    id: String(item.trackId || item.collectionId || item.artistId || ""),
    source: "itunes",
    type,
    title: item.trackName || item.collectionName || item.artistName || "Sem título",
    subtitle: item.artistName || "",
    description: description,
    image: upgradeITunesImage(item.artworkUrl100) || DEFAULT_COVER,
    url: item.trackViewUrl || item.collectionViewUrl || item.artistViewUrl || "",
    releaseDate: item.releaseDate || "",
    genre: item.primaryGenreName || "",
    popularity: null,
    raw: item
  };
}

/* =========================
   RENDERIZAÇÃO
========================= */

/**
 * Renderiza os detalhes do item na página
 * @param {Object} item - Item a renderizar
 */
function renderDetails(item) {
  if (!item) {
    console.warn("renderDetails: Item é null/undefined");
    return;
  }

  console.log("renderDetails: Renderizando item:", item);

  if (detailsContent) detailsContent.hidden = false;
  if (detailsError) detailsError.hidden = true;

  // Imagem
  if (detailsImage) {
    detailsImage.src = item.image || DEFAULT_COVER;
    detailsImage.onerror = () => {
      detailsImage.src = DEFAULT_COVER;
    };
  } else {
    console.warn("renderDetails: Elemento detailsImage não encontrado");
  }

  // Tipo
  if (detailsType) {
    detailsType.textContent = getTypeLabel(item.type);
  } else {
    console.warn("renderDetails: Elemento detailsType não encontrado");
  }

  // Título
  if (detailsTitle) {
    detailsTitle.textContent = item.title || "Sem título";
  } else {
    console.warn("renderDetails: Elemento detailsTitle não encontrado");
  }

  // Biografia/Descrição
  if (artistBiography) {
    artistBiography.textContent = item.description || "Sem descrição disponível.";
  } else {
    console.warn("renderDetails: Elemento artistBiography não encontrado");
  }

  // Meta informações
  if (detailsMeta) {
    detailsMeta.innerHTML = "";

    const metaItems = [
      item.source ? `Fonte: ${item.source === "itunes" ? "Apple Music" : "Spotify"}` : "",
      item.genre ? `Gênero: ${item.genre}` : "",
      item.releaseDate ? `Lançamento: ${formatDate(item.releaseDate)}` : "",
      item.type === "artist" && item.popularity ? `Popularidade: ${item.popularity}%` : ""
    ].filter(Boolean);

    metaItems.forEach((meta) => {
      const span = document.createElement("span");
      span.textContent = meta;
      detailsMeta.appendChild(span);
    });
  } else {
    console.warn("renderDetails: Elemento detailsMeta não encontrado");
  }

  // Botões de ação
  if (spotifyLink) {
    spotifyLink.href = item.url || "#";
    spotifyLink.hidden = !item.url;
    spotifyLink.textContent = item.source === "itunes" ? "Abrir na App Store" : "Abrir no Spotify";
  } else {
    console.warn("renderDetails: Elemento spotifyLink não encontrado");
  }

  if (reviewLink) {
    reviewLink.href = `#`;
  } else {
    console.warn("renderDetails: Elemento reviewLink não encontrado");
  }
}

/**
 * Renderiza mensagem de erro
 * @param {string} message - Mensagem de erro
 */
function renderError(message) {
  if (detailsContent) detailsContent.hidden = true;

  if (detailsError) {
    detailsError.hidden = false;
    detailsError.innerHTML = `
      <div class="empty-vinyl-icon">!</div>
      <h2>Ops...</h2>
      <p>${escapeHTML(message || "Erro desconhecido")}</p>
      <a href="search.html">Voltar ao catálogo</a>
    `;
  }
}

/**
 * Controla o estado de carregamento
 * @param {boolean} isLoading - Estado de carregamento
 */
function setLoading(isLoading) {
  if (detailsLoading) detailsLoading.hidden = !isLoading;

  if (isLoading) {
    if (detailsContent) detailsContent.hidden = true;
    if (detailsError) detailsError.hidden = true;
  }
}

/* =========================
   AÇÕES DO USUÁRIO
========================= */

/**
 * Event listener para favoritar item
 */
favoriteDetailBtn?.addEventListener("click", () => {
  if (!currentItem) return;
  favoriteItem(currentItem);
});

reviewLink?.addEventListener("click", (e) => {
  e.preventDefault();
  if (!currentItem) return;
  openReviewForItem(currentItem);
});

/**
 * Adiciona item aos favoritos
 * @async
 * @param {Object} item - Item a favoritar
 */
async function favoriteItem(item) {
  if (!currentUser?.uid || !item?.id) return;

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

/**
 * Abre página de review para um item
 * @param {Object} item - Item para o qual escrever review
 */
function openReviewForItem(item) {
  if (!item?.id || !item?.title || !item?.type) return;

  const query = encodeURIComponent(item.title);
  const id = encodeURIComponent(item.id);
  const type = encodeURIComponent(item.type);
  const source = encodeURIComponent(item.source || detectSource(item.id));

  window.location.href = `timeline.html?review=${query}&itemId=${id}&type=${type}&source=${source}`;
}

/* =========================
   ENVIAR PARA CHAT
========================= */

/**
 * Abre modal para enviar item pelo chat
 * @param {Object} item - Item a enviar
 */
/**
 * Abre modal para compartilhar item (apenas no chat modal)
 * @param {Object} item - Item a compartilhar
 */
function openSendChatModal(item) {
  if (!sendChatModal || !item) return;

  if (sendChatPreviewImage) sendChatPreviewImage.src = item.image || DEFAULT_COVER;
  if (sendChatPreviewTitle) sendChatPreviewTitle.textContent = item.title;
  if (sendChatPreviewSubtitle) sendChatPreviewSubtitle.textContent = item.subtitle || getTypeLabel(item.type);

  if (sendChatUsersList) sendChatUsersList.innerHTML = `<p class="muted-text">Busque um usuário para enviar.</p>`;
  if (sendChatUserSearch) sendChatUserSearch.value = "";

  sendChatModal.hidden = false;
  sendChatUserSearch?.focus();
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
}, DEBOUNCE_DELAY));

/**
 * Busca usuários por termo
 * @async
 * @param {string} term - Termo de busca
 * @returns {Promise<Array>} Lista de usuários encontrados
 */
async function searchUsers(term) {
  if (!term?.trim()) return [];

  const normalized = normalizeText(term);
  const users = [];

  // Verificar cache
  const cacheKey = normalized.substring(0, 3);
  if (userSearchCache.has(cacheKey)) {
    return userSearchCache.get(cacheKey).filter(u => 
      normalizeText(u.title + u.subtitle).includes(normalized)
    );
  }

  try {
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

    // Cachear resultados
    if (!userSearchCache.has(cacheKey)) {
      userSearchCache.set(cacheKey, users);
    }

    return users.slice(0, MAX_SEARCH_RESULTS);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }
}

/**
 * Renderiza lista de usuários para enviar item
 * @param {Array<Object>} users - Lista de usuários
 */
function renderSendChatUsers(users) {
  sendChatUsersList.innerHTML = "";

  if (!Array.isArray(users) || !users.length) {
    sendChatUsersList.innerHTML = `<p class="muted-text">Nenhum usuário encontrado.</p>`;
    return;
  }

  users.forEach((user) => {
    if (!user?.id || !user?.title) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "send-chat-user";
    button.setAttribute("aria-label", `Enviar para ${user.title}`);

    button.innerHTML = `
      <img src="${escapeHTML(user.image || DEFAULT_AVATAR)}" alt="Foto de ${escapeHTML(user.title)}" loading="lazy">

      <div>
        <strong>${escapeHTML(user.title)}</strong>
        <span>${escapeHTML(user.subtitle || "")}</span>
      </div>

      <small>Enviar</small>
    `;

    button.addEventListener("click", () => {
      sendItemToUser(user);
    });

    sendChatUsersList.appendChild(button);
  });
}

/**
 * Envia item para um usuário via chat
 * @async
 * @param {Object} user - Usuário destinatário
 */
async function sendItemToUser(user) {
  if (!currentUser?.uid || !currentItem?.id || !user?.id) return;

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
            provider: currentItem.source === "itunes" ? "Apple Music" : "Spotify",
            title: currentItem.title,
            description: currentItem.description || currentItem.subtitle || "",
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

/**
 * Cria ID único para uma conversa
 * @param {string} uid1 - UID do primeiro usuário
 * @param {string} uid2 - UID do segundo usuário
 * @returns {string} ID da conversa
 */
function createChatId(uid1, uid2) {
  if (!uid1 || !uid2) throw new Error("UIDs inválidos.");
  return [uid1, uid2].sort().join("_");
}

/**
 * Retorna label em português para tipo de item
 * @param {string} type - Tipo do item
 * @returns {string} Label em português
 */
function getTypeLabel(type) {
  const labels = {
    track: "Música",
    album: "Álbum",
    artist: "Artista",
    playlist: "Playlist"
  };

  return labels[type] || "Item";
}

/**
 * Melhora resolução de imagens do iTunes
 * @param {string} url - URL da imagem
 * @returns {string} URL com melhor resolução
 */
function upgradeITunesImage(url) {
  if (!url || typeof url !== "string") return "";

  return url
    .replace("100x100bb", "800x800bb")
    .replace("100x100", "800x800");
}

/**
 * Formata data para português
 * @param {string|Date} value - Data a formatar
 * @returns {string} Data formatada
 */
function formatDate(value) {
  if (!value) return "";

  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
}

/**
 * Formata número para notação compacta
 * @param {number} value - Número a formatar
 * @returns {string} Número formatado
 */
function formatNumber(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(num);
}

/**
 * Remove tags HTML de uma string
 * @param {string} value - String com HTML
 * @returns {string} String sem HTML
 */
function stripHTML(value) {
  return String(value || "").replace(/<[^>]*>/g, "").trim();
}

/**
 * Normaliza texto removendo acentos e espaços
 * @param {string} value - Texto a normalizar
 * @returns {string} Texto normalizado
 */
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Escapa caracteres HTML
 * @param {string} value - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Debounce uma função
 * @param {Function} fn - Função a debounce
 * @param {number} delay - Delay em ms
 * @returns {Function} Função debouncenada
 */
function debounce(fn, delay = 300) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Exibe notificação de toast
 * @param {string} message - Mensagem a exibir
 */
function showToast(message) {
  if (!toast) {
    alert(escapeHTML(message));
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, TOAST_DURATION);
}