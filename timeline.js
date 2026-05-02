import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  where,
  limit,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   ELEMENTOS
========================= */

const navbarLinks = document.getElementById("navbarLinks");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const logoutBtn = document.getElementById("logoutBtn");

const navbarAvatar = document.getElementById("navbarAvatar");
const navbarUsername = document.getElementById("navbarUsername");

const sidebarAvatar = document.getElementById("sidebarAvatar");
const sidebarName = document.getElementById("sidebarName");
const sidebarHandle = document.getElementById("sidebarHandle");
const profilePostsCount = document.getElementById("profilePostsCount");
const profileFollowingCount = document.getElementById("profileFollowingCount");

const composerAvatar = document.getElementById("composerAvatar");
const postText = document.getElementById("postText");
const spotifyLinkInput = document.getElementById("spotifyLinkInput");
const imageUrlInput = document.getElementById("imageUrlInput");
const postTypeSelect = document.getElementById("postTypeSelect");
const reviewRatingSelect = document.getElementById("reviewRatingSelect");
const publishPostBtn = document.getElementById("publishPostBtn");

const composerPreview = document.getElementById("composerPreview");
const composerPreviewTitle = document.getElementById("composerPreviewTitle");
const composerPreviewSubtitle = document.getElementById("composerPreviewSubtitle");
const removePreviewBtn = document.getElementById("removePreviewBtn");

const feedTabs = document.getElementById("feedTabs");
const feedInfoText = document.getElementById("feedInfoText");
const feedList = document.getElementById("feedList");

const storiesRow = document.getElementById("storiesRow");
const newStoryBtn = document.getElementById("newStoryBtn");

const trendingList = document.getElementById("trendingList");
const suggestionsList = document.getElementById("suggestionsList");

const postModal = document.getElementById("postModal");
const postModalContent = document.getElementById("postModalContent");
const closePostModalBtn = document.getElementById("closePostModalBtn");
const closePostModalBackdrop = document.getElementById("closePostModalBackdrop");

const editPostModal = document.getElementById("editPostModal");
const closeEditPostBackdrop = document.getElementById("closeEditPostBackdrop");
const closeEditPostBtn = document.getElementById("closeEditPostBtn");
const editPostText = document.getElementById("editPostText");
const editPostImage = document.getElementById("editPostImage");
const editPostSpotify = document.getElementById("editPostSpotify");
const saveEditPostBtn = document.getElementById("saveEditPostBtn");

const toast = document.getElementById("toast");

/* =========================
   ESTADO
========================= */

const DEFAULT_AVATAR = "https://placehold.co/120x120/111111/ff4d6d?text=V";
const DEFAULT_STORY_BG = "https://placehold.co/720x1280/111111/ff3f7f?text=VINYL";

let currentUser = null;
let currentUserData = null;
let activeTab = "for-you";
let cachedPosts = [];
let cachedStories = [];
let followingIds = [];
let editingPostId = null;
let unsubscribeFeed = null;
let unsubscribeStories = null;

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  ensureStoryModals();

  await loadCurrentUser();
  await loadFollowing();
  await loadSuggestions();
  await loadTrending();

  listenStories();
  listenFeed();
  openPostFromUrl();
});

/* =========================
   NAVBAR
========================= */

mobileMenuBtn?.addEventListener("click", () => {
  navbarLinks?.classList.toggle("open");
  navbarLinks?.classList.toggle("show");
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
   USUÁRIO
========================= */

async function loadCurrentUser() {
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    currentUserData = snap.exists() ? snap.data() : {};

    const name =
      currentUserData.displayName ||
      currentUserData.name ||
      currentUserData.username ||
      currentUser.displayName ||
      "Usuário Vinyl";

    const username =
      currentUserData.username ||
      currentUser.email?.split("@")[0] ||
      "usuario";

    const avatar =
      currentUserData.photoURL ||
      currentUserData.avatar ||
      currentUser.photoURL ||
      DEFAULT_AVATAR;

    if (navbarAvatar) navbarAvatar.src = avatar;
    if (navbarUsername) navbarUsername.textContent = username;

    if (sidebarAvatar) sidebarAvatar.src = avatar;
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarHandle) sidebarHandle.textContent = `@${username}`;

    if (composerAvatar) composerAvatar.src = avatar;

    navbarAvatar.onerror = () => navbarAvatar.src = DEFAULT_AVATAR;
    sidebarAvatar.onerror = () => sidebarAvatar.src = DEFAULT_AVATAR;
    composerAvatar.onerror = () => composerAvatar.src = DEFAULT_AVATAR;
  } catch (error) {
    console.error("Erro ao carregar usuário:", error);
  }
}

async function loadFollowing() {
  try {
    const snap = await getDocs(
      query(
        collection(db, "follows"),
        where("followerId", "==", currentUser.uid),
        limit(100)
      )
    );

    followingIds = snap.docs
      .map((d) => d.data().followingId)
      .filter(Boolean);

    if (profileFollowingCount) {
      profileFollowingCount.textContent = String(followingIds.length);
    }
  } catch (error) {
    console.warn("Erro ao carregar seguindo:", error);
    followingIds = [];

    if (profileFollowingCount) {
      profileFollowingCount.textContent = "0";
    }
  }
}

/* =========================
   STORIES REAIS
========================= */

function ensureStoryModals() {
  if (!document.getElementById("storyCreateModal")) {
    const createModal = document.createElement("div");
    createModal.className = "story-modal";
    createModal.id = "storyCreateModal";
    createModal.hidden = true;

    createModal.innerHTML = `
      <div class="story-modal-backdrop" id="closeStoryCreateBackdrop"></div>

      <section class="story-create-card">
        <header>
          <div>
            <span>Story</span>
            <h2>Novo story</h2>
            <p>Crie um story com texto, imagem ou link musical.</p>
          </div>

          <button type="button" id="closeStoryCreateBtn">×</button>
        </header>

        <label for="storyTextInput">Texto</label>
        <textarea id="storyTextInput" maxlength="280" placeholder="O que você está ouvindo?"></textarea>

        <label for="storyImageInput">Imagem ou GIF por URL</label>
        <input id="storyImageInput" type="url" placeholder="https://..." />

        <label for="storyLinkInput">Link musical</label>
        <input id="storyLinkInput" type="url" placeholder="Spotify, YouTube ou Apple Music" />

        <button type="button" id="publishStoryBtn">Publicar story</button>
      </section>
    `;

    document.body.appendChild(createModal);
  }

  if (!document.getElementById("storyViewerModal")) {
    const viewerModal = document.createElement("div");
    viewerModal.className = "story-viewer-modal";
    viewerModal.id = "storyViewerModal";
    viewerModal.hidden = true;

    viewerModal.innerHTML = `
      <div class="story-viewer-backdrop" id="closeStoryViewerBackdrop"></div>

      <section class="story-viewer-card">
        <button type="button" class="story-viewer-close" id="closeStoryViewerBtn">×</button>

        <div class="story-progress">
          <span id="storyProgressBar"></span>
        </div>

        <header class="story-viewer-header">
          <img id="storyViewerAvatar" src="${DEFAULT_AVATAR}" alt="Avatar" />

          <div>
            <strong id="storyViewerName">Usuário Vinyl</strong>
            <span id="storyViewerTime">agora</span>
          </div>
        </header>

        <div class="story-viewer-body" id="storyViewerBody">
          <p>Carregando story...</p>
        </div>

        <footer class="story-viewer-footer">
          <button type="button" id="prevStoryBtn">Anterior</button>
          <button type="button" id="nextStoryBtn">Próximo</button>
        </footer>
      </section>
    `;

    document.body.appendChild(viewerModal);
  }

  injectStoryCSS();
  bindStoryModalEvents();
}

function injectStoryCSS() {
  if (document.getElementById("storyDynamicStyles")) return;

  const style = document.createElement("style");
  style.id = "storyDynamicStyles";

  style.textContent = `
    .story-modal,
    .story-viewer-modal {
      position: fixed;
      inset: 0;
      z-index: 420;
      display: grid;
      place-items: center;
      padding: 22px;
    }

    .story-modal[hidden],
    .story-viewer-modal[hidden] {
      display: none !important;
    }

    .story-modal-backdrop,
    .story-viewer-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, .76);
      backdrop-filter: blur(14px);
    }

    .story-create-card {
      position: relative;
      z-index: 2;
      width: min(560px, 100%);
      max-height: 92vh;
      overflow-y: auto;
      padding: 24px;
      border-radius: 30px;
      background:
        radial-gradient(circle at top left, rgba(255, 63, 127, .18), transparent 32%),
        rgba(16, 16, 22, .98);
      border: 1px solid rgba(255, 255, 255, .10);
      box-shadow: 0 40px 120px rgba(0, 0, 0, .65);
      color: #fff;
    }

    .story-create-card header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .story-create-card header span {
      color: #ff7ba2;
      font-size: .78rem;
      font-weight: 1000;
      text-transform: uppercase;
    }

    .story-create-card header h2 {
      margin: 4px 0 0;
      font-size: 2rem;
      letter-spacing: -.04em;
    }

    .story-create-card header p {
      margin: 6px 0 0;
      color: rgba(255,255,255,.62);
    }

    #closeStoryCreateBtn {
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
      color: #fff;
      font-size: 1.35rem;
      background: rgba(255,255,255,.08);
    }

    .story-create-card label {
      display: block;
      margin: 14px 0 8px;
      font-weight: 900;
    }

    .story-create-card textarea,
    .story-create-card input {
      width: 100%;
      border: 1px solid rgba(255,255,255,.08);
      outline: none;
      border-radius: 18px;
      color: #fff;
      padding: 14px;
      background: rgba(255,255,255,.045);
    }

    .story-create-card textarea {
      min-height: 130px;
      resize: vertical;
    }

    #publishStoryBtn {
      width: 100%;
      min-height: 50px;
      margin-top: 18px;
      border: 0;
      border-radius: 999px;
      color: #fff;
      cursor: pointer;
      font-weight: 1000;
      background: linear-gradient(135deg, #ff3f7f, #ff2d65);
      box-shadow: 0 18px 44px rgba(255, 45, 85, .24);
    }

    .story-viewer-card {
      position: relative;
      z-index: 2;
      width: min(420px, 100%);
      height: min(760px, calc(100vh - 44px));
      overflow: hidden;
      border-radius: 34px;
      background: #08080d;
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 40px 120px rgba(0,0,0,.7);
      color: #fff;
      display: grid;
      grid-template-rows: auto auto 1fr auto;
    }

    .story-viewer-close {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 5;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
      color: #fff;
      font-size: 1.35rem;
      background: rgba(0,0,0,.42);
      backdrop-filter: blur(8px);
    }

    .story-progress {
      position: relative;
      z-index: 2;
      height: 4px;
      margin: 14px 54px 0 14px;
      border-radius: 999px;
      background: rgba(255,255,255,.18);
      overflow: hidden;
    }

    .story-progress span {
      display: block;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #ff3f7f, #ffca5f);
      transform-origin: left;
      animation: storyProgress 7s linear forwards;
    }

    @keyframes storyProgress {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }

    .story-viewer-header {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
    }

    .story-viewer-header img {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255,77,109,.7);
    }

    .story-viewer-header strong,
    .story-viewer-header span {
      display: block;
    }

    .story-viewer-header span {
      color: rgba(255,255,255,.62);
      font-size: .8rem;
      margin-top: 2px;
    }

    .story-viewer-body {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      padding: 18px;
      text-align: center;
      background:
        radial-gradient(circle at top, rgba(255,63,127,.22), transparent 34%),
        linear-gradient(180deg, #15151d, #07070a);
    }

    .story-viewer-body.has-image {
      background-size: cover;
      background-position: center;
    }

    .story-viewer-body.has-image::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.55)),
        radial-gradient(circle at center, transparent, rgba(0,0,0,.35));
      z-index: -1;
    }

    .story-viewer-text {
      max-width: 92%;
      padding: 18px;
      border-radius: 24px;
      color: #fff;
      font-size: 1.45rem;
      line-height: 1.15;
      font-weight: 1000;
      letter-spacing: -.04em;
      text-shadow: 0 6px 20px rgba(0,0,0,.45);
      background: rgba(0,0,0,.22);
      backdrop-filter: blur(6px);
    }

    .story-viewer-link {
      display: inline-flex;
      margin-top: 16px;
      color: #fff;
      text-decoration: none;
      border-radius: 999px;
      padding: 12px 16px;
      font-weight: 1000;
      background: linear-gradient(135deg, #ff3f7f, #ff2d65);
    }

    .story-viewer-footer {
      position: relative;
      z-index: 2;
      display: flex;
      gap: 10px;
      padding: 14px;
      background: rgba(8,8,13,.92);
    }

    .story-viewer-footer button {
      flex: 1;
      min-height: 44px;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 999px;
      cursor: pointer;
      color: #fff;
      font-weight: 900;
      background: rgba(255,255,255,.06);
    }
  `;

  document.head.appendChild(style);
}

function bindStoryModalEvents() {
  const storyCreateModal = document.getElementById("storyCreateModal");
  const closeStoryCreateBackdrop = document.getElementById("closeStoryCreateBackdrop");
  const closeStoryCreateBtn = document.getElementById("closeStoryCreateBtn");
  const publishStoryBtn = document.getElementById("publishStoryBtn");

  const storyViewerModal = document.getElementById("storyViewerModal");
  const closeStoryViewerBackdrop = document.getElementById("closeStoryViewerBackdrop");
  const closeStoryViewerBtn = document.getElementById("closeStoryViewerBtn");
  const prevStoryBtn = document.getElementById("prevStoryBtn");
  const nextStoryBtn = document.getElementById("nextStoryBtn");

  closeStoryCreateBackdrop?.addEventListener("click", closeStoryCreate);
  closeStoryCreateBtn?.addEventListener("click", closeStoryCreate);
  publishStoryBtn?.addEventListener("click", publishStory);

  closeStoryViewerBackdrop?.addEventListener("click", closeStoryViewer);
  closeStoryViewerBtn?.addEventListener("click", closeStoryViewer);

  prevStoryBtn?.addEventListener("click", () => showStoryByOffset(-1));
  nextStoryBtn?.addEventListener("click", () => showStoryByOffset(1));

  storyCreateModal?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  storyViewerModal?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

newStoryBtn?.addEventListener("click", () => {
  openStoryCreate();
});

function openStoryCreate() {
  const modal = document.getElementById("storyCreateModal");
  const storyTextInput = document.getElementById("storyTextInput");
  const storyImageInput = document.getElementById("storyImageInput");
  const storyLinkInput = document.getElementById("storyLinkInput");

  if (!modal) return;

  storyTextInput.value = "";
  storyImageInput.value = "";
  storyLinkInput.value = "";

  modal.hidden = false;
  storyTextInput.focus();
}

function closeStoryCreate() {
  const modal = document.getElementById("storyCreateModal");
  if (modal) modal.hidden = true;
}

async function publishStory() {
  const storyTextInput = document.getElementById("storyTextInput");
  const storyImageInput = document.getElementById("storyImageInput");
  const storyLinkInput = document.getElementById("storyLinkInput");
  const publishStoryBtn = document.getElementById("publishStoryBtn");

  const text = storyTextInput.value.trim();
  const imageUrl = storyImageInput.value.trim();
  const linkUrl = storyLinkInput.value.trim();

  if (!text && !imageUrl && !linkUrl) {
    showToast("Adicione texto, imagem ou link no story.");
    return;
  }

  try {
    publishStoryBtn.disabled = true;
    publishStoryBtn.textContent = "Publicando...";

    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );

    await addDoc(collection(db, "stories"), {
      userId: currentUser.uid,
      userName:
        currentUserData?.displayName ||
        currentUserData?.name ||
        currentUserData?.username ||
        currentUser.displayName ||
        "Usuário Vinyl",
      userUsername:
        currentUserData?.username ||
        currentUser.email?.split("@")[0] ||
        "usuario",
      userAvatar:
        currentUserData?.photoURL ||
        currentUserData?.avatar ||
        currentUser.photoURL ||
        DEFAULT_AVATAR,
      text,
      imageUrl,
      linkUrl,
      viewsCount: 0,
      createdAt: serverTimestamp(),
      expiresAt
    });

    closeStoryCreate();
    showToast("Story publicado.");
  } catch (error) {
    console.error("Erro ao publicar story:", error);
    showToast("Não foi possível publicar o story.");
  } finally {
    publishStoryBtn.disabled = false;
    publishStoryBtn.textContent = "Publicar story";
  }
}

function listenStories() {
  if (!storiesRow) return;

  if (unsubscribeStories) {
    unsubscribeStories();
  }

  const storiesQuery = query(
    collection(db, "stories"),
    orderBy("createdAt", "desc"),
    limit(40)
  );

  unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
    const now = Date.now();

    cachedStories = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .filter((story) => {
        if (!story.expiresAt) return true;

        const expiresAt = story.expiresAt.toDate
          ? story.expiresAt.toDate().getTime()
          : new Date(story.expiresAt).getTime();

        return expiresAt > now;
      });

    renderStories();
  }, (error) => {
    console.error("Erro ao carregar stories:", error);
    renderStoriesFallback();
  });
}

function renderStories() {
  if (!storiesRow) return;

  const ownAvatar =
    currentUserData?.photoURL ||
    currentUserData?.avatar ||
    currentUser?.photoURL ||
    DEFAULT_AVATAR;

  const storiesHTML = cachedStories.map((story) => {
    const avatar = story.userAvatar || DEFAULT_AVATAR;
    const username = story.userUsername || story.userName || "usuario";

    return `
      <button type="button" class="story-pill story-real" data-story-id="${escapeHTML(story.id)}">
        <div class="story-avatar">
          <img src="${escapeHTML(avatar)}" alt="${escapeHTML(username)}">
        </div>
        <span>${escapeHTML(username)}</span>
      </button>
    `;
  }).join("");

  storiesRow.innerHTML = `
    <button type="button" class="story-pill" id="createStoryPill">
      <div class="story-avatar own">
        <img src="${escapeHTML(ownAvatar)}" alt="Seu story">
      </div>
      <span>Seu story</span>
    </button>
    ${storiesHTML || `<p class="empty-feed">Nenhum story ativo.</p>`}
  `;

  document.getElementById("createStoryPill")?.addEventListener("click", openStoryCreate);

  document.querySelectorAll("[data-story-id]").forEach((button) => {
    button.addEventListener("click", () => {
      openStoryViewer(button.dataset.storyId);
    });
  });
}

function renderStoriesFallback() {
  storiesRow.innerHTML = `
    <button type="button" class="story-pill" id="createStoryPill">
      <div class="story-avatar own">VINYL</div>
      <span>Seu story</span>
    </button>
    <p class="empty-feed">Não foi possível carregar stories.</p>
  `;

  document.getElementById("createStoryPill")?.addEventListener("click", openStoryCreate);
}

let activeStoryIndex = 0;
let storyAutoTimer = null;

function openStoryViewer(storyId) {
  const index = cachedStories.findIndex((story) => story.id === storyId);

  if (index < 0) {
    showToast("Story não encontrado.");
    return;
  }

  activeStoryIndex = index;
  renderStoryViewer();
}

async function renderStoryViewer() {
  const modal = document.getElementById("storyViewerModal");
  const avatar = document.getElementById("storyViewerAvatar");
  const name = document.getElementById("storyViewerName");
  const time = document.getElementById("storyViewerTime");
  const body = document.getElementById("storyViewerBody");
  const progress = document.getElementById("storyProgressBar");

  const story = cachedStories[activeStoryIndex];

  if (!story || !modal) return;

  const imageUrl = story.imageUrl || "";
  const text = story.text || "";
  const linkUrl = story.linkUrl || "";

  avatar.src = story.userAvatar || DEFAULT_AVATAR;
  avatar.onerror = () => {
    avatar.src = DEFAULT_AVATAR;
  };

  name.textContent = story.userName || "Usuário Vinyl";
  time.textContent = formatPostDate(story.createdAt);

  body.classList.toggle("has-image", Boolean(imageUrl));
  body.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : "";

  body.innerHTML = `
    <div>
      ${text ? `<div class="story-viewer-text">${escapeHTML(text)}</div>` : ""}
      ${!text && !imageUrl ? `<div class="story-viewer-text">Story Vinyl</div>` : ""}
      ${linkUrl ? `<a class="story-viewer-link" href="${escapeHTML(linkUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(getProviderName(linkUrl))}</a>` : ""}
    </div>
  `;

  modal.hidden = false;

  if (progress) {
    progress.style.animation = "none";
    progress.offsetHeight;
    progress.style.animation = "";
  }

  await markStoryViewed(story.id);
  startStoryAutoNext();
}

async function markStoryViewed(storyId) {
  try {
    const viewRef = doc(db, "stories", storyId, "views", currentUser.uid);
    const viewSnap = await getDoc(viewRef);

    if (!viewSnap.exists()) {
      await setDoc(viewRef, {
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "stories", storyId), {
        viewsCount: increment(1)
      });
    }
  } catch (error) {
    console.warn("Não foi possível registrar visualização:", error);
  }
}

function startStoryAutoNext() {
  clearTimeout(storyAutoTimer);

  storyAutoTimer = setTimeout(() => {
    showStoryByOffset(1);
  }, 7000);
}

function showStoryByOffset(offset) {
  if (!cachedStories.length) return;

  activeStoryIndex += offset;

  if (activeStoryIndex < 0) {
    activeStoryIndex = cachedStories.length - 1;
  }

  if (activeStoryIndex >= cachedStories.length) {
    closeStoryViewer();
    return;
  }

  renderStoryViewer();
}

function closeStoryViewer() {
  const modal = document.getElementById("storyViewerModal");

  clearTimeout(storyAutoTimer);

  if (modal) {
    modal.hidden = true;
  }
}

/* =========================
   COMPOSER PREVIEW
========================= */

spotifyLinkInput?.addEventListener("input", () => {
  const link = spotifyLinkInput.value.trim();

  if (!link) {
    composerPreview.hidden = true;
    return;
  }

  const provider = detectLinkProvider(link);

  composerPreviewTitle.textContent = provider;
  composerPreviewSubtitle.textContent = link;
  composerPreview.hidden = false;
});

removePreviewBtn?.addEventListener("click", () => {
  spotifyLinkInput.value = "";
  composerPreview.hidden = true;
});

function detectLinkProvider(url = "") {
  const clean = url.toLowerCase();

  if (clean.includes("open.spotify.com")) return "Spotify detectado";
  if (clean.includes("youtube.com") || clean.includes("youtu.be")) return "YouTube detectado";
  if (clean.includes("music.apple.com")) return "Apple Music detectado";

  return "Link detectado";
}

/* =========================
   PUBLICAR POST
========================= */

publishPostBtn?.addEventListener("click", publishPost);

async function publishPost() {
  const content = postText.value.trim();
  const linkUrl = spotifyLinkInput.value.trim();
  const imageUrl = imageUrlInput.value.trim();
  const postType = postTypeSelect.value;
  const rating = Number(reviewRatingSelect.value || 0);

  if (!content && !linkUrl && !imageUrl) {
    showToast("Escreva algo ou adicione mídia.");
    return;
  }

  try {
    publishPostBtn.disabled = true;
    publishPostBtn.textContent = "Publicando...";

    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      userName:
        currentUserData?.displayName ||
        currentUserData?.name ||
        currentUserData?.username ||
        currentUser.displayName ||
        "Usuário Vinyl",
      userUsername:
        currentUserData?.username ||
        currentUser.email?.split("@")[0] ||
        "usuario",
      userAvatar:
        currentUserData?.photoURL ||
        currentUserData?.avatar ||
        currentUser.photoURL ||
        DEFAULT_AVATAR,
      content,
      spotifyUrl: linkUrl,
      imageUrl,
      postType,
      rating,
      likesCount: 0,
      repliesCount: 0,
      repostsCount: 0,
      edited: false,
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    postText.value = "";
    spotifyLinkInput.value = "";
    imageUrlInput.value = "";
    postTypeSelect.value = "normal";
    reviewRatingSelect.value = "0";
    composerPreview.hidden = true;

    showToast("Post publicado.");
  } catch (error) {
    console.error("Erro ao publicar:", error);
    showToast("Não foi possível publicar o post.");
  } finally {
    publishPostBtn.disabled = false;
    publishPostBtn.textContent = "Publicar";
  }
}

/* =========================
   TABS
========================= */

feedTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;

  document.querySelectorAll("#feedTabs button").forEach((btn) => {
    btn.classList.remove("active");
  });

  button.classList.add("active");
  activeTab = button.dataset.tab || "for-you";

  renderFeed();
});

/* =========================
   FEED
========================= */

function listenFeed() {
  if (unsubscribeFeed) {
    unsubscribeFeed();
  }

  const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  unsubscribeFeed = onSnapshot(postsQuery, async (snapshot) => {
    const posts = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const post = { id: docSnap.id, ...docSnap.data() };

      if (post.deleted) return null;

      const liked = await checkPostLiked(post.id);
      const reposted = await checkPostReposted(post.id);

      return {
        ...post,
        liked,
        reposted
      };
    }));

    cachedPosts = posts.filter(Boolean);

    const ownPostsCount = cachedPosts.filter((post) => post.userId === currentUser.uid).length;

    if (profilePostsCount) {
      profilePostsCount.textContent = String(ownPostsCount);
    }

    renderFeed();
  }, (error) => {
    console.error("Erro ao ouvir feed:", error);
    feedList.innerHTML = `<p class="empty-feed">Erro ao carregar o feed.</p>`;
  });
}

function renderFeed() {
  if (!feedList) return;

  let posts = [...cachedPosts];

  if (activeTab === "following") {
    posts = posts.filter((post) => followingIds.includes(post.userId));
    feedInfoText.textContent = "Posts de quem você segue.";
  } else if (activeTab === "reviews") {
    posts = posts.filter((post) => post.postType === "review");
    feedInfoText.textContent = "Reviews publicadas pela comunidade.";
  } else {
    posts = posts.sort(sortForYouFeed);
    feedInfoText.textContent = "Posts recentes e relevantes para você.";
  }

  if (!posts.length) {
    let message = "Nenhum post ainda.";

    if (activeTab === "following") {
      message = "Você ainda não segue ninguém ou ninguém postou.";
    } else if (activeTab === "reviews") {
      message = "Nenhuma review encontrada.";
    }

    feedList.innerHTML = `<p class="empty-feed">${message}</p>`;
    return;
  }

  feedList.innerHTML = posts.map((post) => renderPostCard(post)).join("");
  bindPostActions();
}

function sortForYouFeed(a, b) {
  const scoreA = getInteractionCount(a) + getFreshnessBoost(a.createdAt);
  const scoreB = getInteractionCount(b) + getFreshnessBoost(b.createdAt);

  return scoreB - scoreA;
}

function getFreshnessBoost(timestamp) {
  if (!timestamp) return 0;

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60);

  if (hours < 1) return 40;
  if (hours < 6) return 30;
  if (hours < 24) return 20;
  if (hours < 72) return 10;

  return 0;
}

function renderPostCard(post, modalMode = false) {
  const content = escapeHTML(post.content || "");
  const linkUrl = post.spotifyUrl || extractMusicUrl(post.content || "");
  const imageUrl = post.imageUrl || "";
  const isOwner = post.userId === currentUser.uid;

  return `
    <article class="post-card" id="post-${escapeHTML(post.id)}">
      <div class="post-top">
        <img
          class="post-avatar"
          src="${escapeHTML(post.userAvatar || DEFAULT_AVATAR)}"
          alt="${escapeHTML(post.userName || "Usuário")}"
        />

        <div class="post-header">
          <div class="post-header-top">
            <strong>${escapeHTML(post.userName || "Usuário Vinyl")}</strong>
            <span>@${escapeHTML(post.userUsername || "usuario")}</span>
            <span>·</span>
            <span>${formatPostDate(post.createdAt)}</span>
            ${post.edited ? `<span>· editado</span>` : ""}
            ${renderPostBadge(post)}
          </div>
        </div>

        ${isOwner ? `
          <div class="post-menu-wrap">
            <button class="post-menu" data-menu-post="${escapeHTML(post.id)}">•••</button>

            <div class="post-dropdown" id="post-dropdown-${escapeHTML(post.id)}">
              <button type="button" data-edit-post="${escapeHTML(post.id)}">Editar</button>
              <button type="button" data-delete-post="${escapeHTML(post.id)}">Excluir</button>
            </div>
          </div>
        ` : ""}
      </div>

      ${content ? `<div class="post-content">${content}</div>` : ""}

      ${post.postType === "review" && Number(post.rating || 0) > 0
        ? `<div class="post-rating">${renderStars(post.rating)} · ${post.rating}/5</div>`
        : ""}

      ${imageUrl ? `
        <div class="post-image">
          <img src="${escapeHTML(imageUrl)}" alt="Imagem do post">
        </div>
      ` : ""}

      ${linkUrl ? renderMusicPreview(linkUrl) : ""}

      <div class="post-actions">
        <button class="${post.liked ? "liked" : ""}" data-like-post="${escapeHTML(post.id)}">
          ♡ ${post.likesCount || 0}
        </button>

        <button data-toggle-replies="${escapeHTML(post.id)}">
          💬 ${post.repliesCount || 0}
        </button>

        <button class="${post.reposted ? "reposted" : ""}" data-repost-post="${escapeHTML(post.id)}">
          🔁 ${post.repostsCount || 0}
        </button>

        <button data-open-post="${escapeHTML(post.id)}">
          🔍 Abrir
        </button>

        <button data-copy-post="${escapeHTML(post.id)}">
          🔗 Copiar
        </button>
      </div>

      <div class="replies-wrap" id="replies-wrap-${escapeHTML(post.id)}" style="${modalMode ? "display:block;" : "display:none;"}">
        <div class="reply-form">
          <input
            type="text"
            id="reply-input-${escapeHTML(post.id)}"
            placeholder="Escreva uma resposta..."
            maxlength="280"
          />

          <button data-send-reply="${escapeHTML(post.id)}">Responder</button>
        </div>

        <div class="replies-list" id="replies-list-${escapeHTML(post.id)}">
          <p class="empty-feed">Nenhuma resposta ainda.</p>
        </div>
      </div>
    </article>
  `;
}

function renderMusicPreview(url) {
  const provider = getProviderName(url);

  return `
    <a class="spotify-preview" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">
      <div class="spotify-icon">♪</div>

      <div class="spotify-text">
        <strong>${escapeHTML(provider)}</strong>
        <span>${escapeHTML(url)}</span>
      </div>
    </a>
  `;
}

function getProviderName(url = "") {
  const clean = url.toLowerCase();

  if (clean.includes("open.spotify.com")) return "Abrir no Spotify";
  if (clean.includes("youtube.com") || clean.includes("youtu.be")) return "Abrir no YouTube";
  if (clean.includes("music.apple.com")) return "Abrir no Apple Music";

  return "Abrir link";
}

function renderPostBadge(post) {
  if (post.postType === "review") {
    return `<span class="post-badge">Review</span>`;
  }

  if (post.postType === "listening") {
    return `<span class="post-badge">Ouvindo agora</span>`;
  }

  if (post.postType === "recommendation") {
    return `<span class="post-badge">Recomendação</span>`;
  }

  return "";
}

/* =========================
   AÇÕES
========================= */

function bindPostActions() {
  document.querySelectorAll("[data-menu-post]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      const postId = button.dataset.menuPost;
      const dropdown = document.getElementById(`post-dropdown-${postId}`);

      document.querySelectorAll(".post-dropdown").forEach((item) => {
        if (item !== dropdown) item.classList.remove("open");
      });

      dropdown?.classList.toggle("open");
    });
  });

  document.querySelectorAll("[data-like-post]").forEach((button) => {
    button.addEventListener("click", async () => {
      await toggleLike(button.dataset.likePost);
    });
  });

  document.querySelectorAll("[data-repost-post]").forEach((button) => {
    button.addEventListener("click", async () => {
      await toggleRepost(button.dataset.repostPost);
    });
  });

  document.querySelectorAll("[data-copy-post]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyPostLink(button.dataset.copyPost);
    });
  });

  document.querySelectorAll("[data-open-post]").forEach((button) => {
    button.addEventListener("click", () => {
      openPostModal(button.dataset.openPost);
    });
  });

  document.querySelectorAll("[data-toggle-replies]").forEach((button) => {
    button.addEventListener("click", async () => {
      await toggleReplies(button.dataset.toggleReplies);
    });
  });

  document.querySelectorAll("[data-send-reply]").forEach((button) => {
    button.addEventListener("click", async () => {
      await sendReply(button.dataset.sendReply);
    });
  });

  document.querySelectorAll("[data-edit-post]").forEach((button) => {
    button.addEventListener("click", () => {
      openEditPost(button.dataset.editPost);
    });
  });

  document.querySelectorAll("[data-delete-post]").forEach((button) => {
    button.addEventListener("click", async () => {
      await deletePost(button.dataset.deletePost);
    });
  });
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".post-menu-wrap")) {
    document.querySelectorAll(".post-dropdown").forEach((item) => {
      item.classList.remove("open");
    });
  }
});

async function checkPostLiked(postId) {
  try {
    const snap = await getDoc(doc(db, "posts", postId, "likes", currentUser.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

async function checkPostReposted(postId) {
  try {
    const snap = await getDoc(doc(db, "posts", postId, "reposts", currentUser.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

async function toggleLike(postId) {
  try {
    const likeRef = doc(db, "posts", postId, "likes", currentUser.uid);
    const postRef = doc(db, "posts", postId);
    const likeSnap = await getDoc(likeRef);

    if (likeSnap.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(postRef, {
        likesCount: increment(-1)
      });

      showToast("Curtida removida.");
    } else {
      await setDoc(likeRef, {
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(postRef, {
        likesCount: increment(1)
      });

      showToast("Post curtido.");
    }
  } catch (error) {
    console.error("Erro ao curtir:", error);
    showToast("Não foi possível curtir.");
  }
}

async function toggleRepost(postId) {
  try {
    const repostRef = doc(db, "posts", postId, "reposts", currentUser.uid);
    const postRef = doc(db, "posts", postId);
    const repostSnap = await getDoc(repostRef);

    if (repostSnap.exists()) {
      await deleteDoc(repostRef);
      await updateDoc(postRef, {
        repostsCount: increment(-1)
      });

      showToast("Republicação removida.");
    } else {
      await setDoc(repostRef, {
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(postRef, {
        repostsCount: increment(1)
      });

      showToast("Post republicado.");
    }
  } catch (error) {
    console.error("Erro ao republicar:", error);
    showToast("Não foi possível republicar.");
  }
}

async function copyPostLink(postId) {
  try {
    const url = `${window.location.origin}/timeline.html?post=${encodeURIComponent(postId)}`;
    await navigator.clipboard.writeText(url);
    showToast("Link do post copiado.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível copiar o link.");
  }
}

/* =========================
   RESPOSTAS
========================= */

async function toggleReplies(postId) {
  const wrap = document.getElementById(`replies-wrap-${postId}`);

  if (!wrap) return;

  const isHidden = wrap.style.display === "none";

  if (isHidden) {
    wrap.style.display = "block";
    await loadReplies(postId);
  } else {
    wrap.style.display = "none";
  }
}

async function loadReplies(postId) {
  const repliesList = document.getElementById(`replies-list-${postId}`);

  if (!repliesList) return;

  repliesList.innerHTML = `<p class="empty-feed">Carregando respostas...</p>`;

  try {
    const snap = await getDocs(
      query(
        collection(db, "posts", postId, "replies"),
        orderBy("createdAt", "asc"),
        limit(30)
      )
    );

    if (snap.empty) {
      repliesList.innerHTML = `<p class="empty-feed">Nenhuma resposta ainda.</p>`;
      return;
    }

    repliesList.innerHTML = snap.docs.map((docSnap) => {
      const reply = docSnap.data();

      return `
        <div class="reply-item">
          <strong>${escapeHTML(reply.userName || "Usuário")}</strong>
          <span>@${escapeHTML(reply.userUsername || "usuario")} · ${formatPostDate(reply.createdAt)}</span>
          <p>${escapeHTML(reply.text || "")}</p>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Erro ao carregar respostas:", error);
    repliesList.innerHTML = `<p class="empty-feed">Erro ao carregar respostas.</p>`;
  }
}

async function sendReply(postId) {
  const input = document.getElementById(`reply-input-${postId}`);

  if (!input) return;

  const text = input.value.trim();

  if (!text) {
    showToast("Escreva uma resposta.");
    return;
  }

  try {
    await addDoc(collection(db, "posts", postId, "replies"), {
      userId: currentUser.uid,
      userName:
        currentUserData?.displayName ||
        currentUserData?.name ||
        currentUserData?.username ||
        currentUser.displayName ||
        "Usuário Vinyl",
      userUsername:
        currentUserData?.username ||
        currentUser.email?.split("@")[0] ||
        "usuario",
      text,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "posts", postId), {
      repliesCount: increment(1)
    });

    input.value = "";
    await loadReplies(postId);

    showToast("Resposta enviada.");
  } catch (error) {
    console.error("Erro ao responder:", error);
    showToast("Não foi possível responder.");
  }
}

/* =========================
   MODAL POST
========================= */

function openPostModal(postId) {
  const post = cachedPosts.find((item) => item.id === postId);

  if (!post) {
    showToast("Post não encontrado.");
    return;
  }

  postModalContent.innerHTML = renderPostCard(post, true);
  postModal.hidden = false;

  bindPostActions();
  loadReplies(postId);

  const url = new URL(window.location.href);
  url.searchParams.set("post", postId);
  window.history.replaceState({}, "", url.toString());
}

function closePostModal() {
  postModal.hidden = true;

  const url = new URL(window.location.href);
  url.searchParams.delete("post");
  window.history.replaceState({}, "", url.toString());
}

closePostModalBtn?.addEventListener("click", closePostModal);
closePostModalBackdrop?.addEventListener("click", closePostModal);

function openPostFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post");

  if (!postId) return;

  setTimeout(() => {
    openPostModal(postId);
  }, 900);
}

/* =========================
   EDITAR POST
========================= */

function openEditPost(postId) {
  const post = cachedPosts.find((item) => item.id === postId);

  if (!post) {
    showToast("Post não encontrado.");
    return;
  }

  if (post.userId !== currentUser.uid) {
    showToast("Você não pode editar esse post.");
    return;
  }

  editingPostId = postId;
  editPostText.value = post.content || "";
  editPostImage.value = post.imageUrl || "";
  editPostSpotify.value = post.spotifyUrl || "";

  editPostModal.hidden = false;
}

function closeEditPostModal() {
  editPostModal.hidden = true;
  editingPostId = null;
}

closeEditPostBtn?.addEventListener("click", closeEditPostModal);
closeEditPostBackdrop?.addEventListener("click", closeEditPostModal);

saveEditPostBtn?.addEventListener("click", async () => {
  if (!editingPostId) return;

  const content = editPostText.value.trim();
  const imageUrl = editPostImage.value.trim();
  const spotifyUrl = editPostSpotify.value.trim();

  if (!content && !imageUrl && !spotifyUrl) {
    showToast("O post não pode ficar vazio.");
    return;
  }

  try {
    await updateDoc(doc(db, "posts", editingPostId), {
      content,
      imageUrl,
      spotifyUrl,
      edited: true,
      updatedAt: serverTimestamp()
    });

    closeEditPostModal();
    showToast("Post atualizado.");
  } catch (error) {
    console.error("Erro ao editar:", error);
    showToast("Não foi possível editar.");
  }
});

async function deletePost(postId) {
  const confirmed = window.confirm("Deseja excluir este post?");

  if (!confirmed) return;

  try {
    await updateDoc(doc(db, "posts", postId), {
      deleted: true,
      updatedAt: serverTimestamp()
    });

    showToast("Post excluído.");
  } catch (error) {
    console.error("Erro ao excluir:", error);
    showToast("Não foi possível excluir.");
  }
}

/* =========================
   SIDEBAR
========================= */

async function loadTrending() {
  if (!trendingList) return;

  try {
    const snap = await getDocs(
      query(
        collection(db, "searchStats"),
        orderBy("count", "desc"),
        limit(6)
      )
    );

    if (snap.empty) {
      renderFallbackTrending();
      return;
    }

    trendingList.innerHTML = snap.docs.map((docSnap, index) => {
      const item = docSnap.data();
      const icon = ["🔥", "🎧", "💿", "🎤", "⭐", "📈"][index % 6];

      return `
        <div class="trending-item">
          <div class="trending-icon">${icon}</div>

          <div class="trending-text">
            <strong>${escapeHTML(item.term || "Busca")}</strong>
            <span>${item.count || 0} buscas</span>
          </div>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.warn("Erro ao carregar trending:", error);
    renderFallbackTrending();
  }
}

function renderFallbackTrending() {
  trendingList.innerHTML = `
    <div class="trending-item">
      <div class="trending-icon">🔥</div>
      <div class="trending-text">
        <strong>SZA</strong>
        <span>Sugestão popular</span>
      </div>
    </div>

    <div class="trending-item">
      <div class="trending-icon">🎧</div>
      <div class="trending-text">
        <strong>Frank Ocean</strong>
        <span>Sugestão popular</span>
      </div>
    </div>

    <div class="trending-item">
      <div class="trending-icon">💿</div>
      <div class="trending-text">
        <strong>The Weeknd</strong>
        <span>Sugestão popular</span>
      </div>
    </div>
  `;
}

async function loadSuggestions() {
  if (!suggestionsList) return;

  try {
    const snap = await getDocs(query(collection(db, "users"), limit(8)));

    const users = snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((user) => user.id !== currentUser.uid)
      .slice(0, 5);

    if (!users.length) {
      suggestionsList.innerHTML = `<p class="side-empty">Sem sugestões agora.</p>`;
      return;
    }

    suggestionsList.innerHTML = users.map((user) => {
      const avatar = user.photoURL || user.avatar || DEFAULT_AVATAR;
      const name = user.displayName || user.name || user.username || "Usuário";
      const username = user.username || "usuario";

      return `
        <div class="suggestion-item">
          <img src="${escapeHTML(avatar)}" alt="${escapeHTML(name)}">

          <div class="suggestion-text">
            <strong>${escapeHTML(name)}</strong>
            <span>@${escapeHTML(username)}</span>
          </div>

          <a href="public-profile.html?uid=${encodeURIComponent(user.id)}">Ver</a>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Erro ao carregar sugestões:", error);
    suggestionsList.innerHTML = `<p class="side-empty">Erro ao carregar sugestões.</p>`;
  }
}

/* =========================
   HELPERS
========================= */

function getInteractionCount(post) {
  return (
    Number(post.likesCount || 0) +
    Number(post.repliesCount || 0) +
    Number(post.repostsCount || 0)
  );
}

function renderStars(rating) {
  const value = Math.max(1, Math.min(5, Number(rating || 5)));

  return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
}

function extractMusicUrl(text = "") {
  const match = String(text).match(/https?:\/\/(open\.spotify\.com|music\.apple\.com|youtu\.be|www\.youtube\.com)\/[^\s]+/i);
  return match ? match[0] : "";
}

function formatPostDate(timestamp) {
  if (!timestamp) return "agora";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Date.now() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString("pt-BR");
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2700);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (postModal && !postModal.hidden) closePostModal();
    if (editPostModal && !editPostModal.hidden) closeEditPostModal();
    closeStoryCreate();
    closeStoryViewer();
  }
});