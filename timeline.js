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
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   ELEMENTOS
========================= */

const navAvatar = document.getElementById("navAvatar");
const navUsername = document.getElementById("navUsername");
const logoutBtn = document.getElementById("logoutBtn");

const sidebarAvatar = document.getElementById("sidebarAvatar");
const sidebarName = document.getElementById("sidebarName");
const sidebarUsername = document.getElementById("sidebarUsername");
const postCount = document.getElementById("postCount");
const followingCount = document.getElementById("followingCount");

const composerAvatar = document.getElementById("composerAvatar");
const postText = document.getElementById("postText");
const spotifyLink = document.getElementById("spotifyLink");
const mediaUrl = document.getElementById("mediaUrl");
const postType = document.getElementById("postType");
const rating = document.getElementById("rating");
const publishPost = document.getElementById("publishPost");

const feedList = document.getElementById("feedList");
const refreshFeedBtn = document.getElementById("refreshFeedBtn");
const tabButtons = document.querySelectorAll(".tab-btn");

const storiesList = document.getElementById("storiesList");
const addStoryBtn = document.getElementById("addStoryBtn");
const storyModal = document.getElementById("storyModal");
const closeStoryModal = document.getElementById("closeStoryModal");
const storyText = document.getElementById("storyText");
const storyMediaUrl = document.getElementById("storyMediaUrl");
const publishStoryBtn = document.getElementById("publishStoryBtn");

const trendList = document.getElementById("trendList");
const suggestionsList = document.getElementById("suggestionsList");
const toast = document.getElementById("toast");

/* =========================
   ESTADO
========================= */

const DEFAULT_AVATAR = "https://api.dicebear.com/8.x/shapes/svg?seed=vinyl";

let currentUser = null;
let currentUserData = {};
let currentFilter = "for-you";
let followingIds = [];
let cachedPosts = [];
let cachedStories = [];

let unsubscribePosts = null;
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

  await loadCurrentUser();
  await loadFollowing();
  await loadSuggestions();

  listenPosts();
  listenStories();
});

/* =========================
   EVENTOS
========================= */

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    showToast("Não foi possível sair agora.");
  }
});

publishPost?.addEventListener("click", createPost);

refreshFeedBtn?.addEventListener("click", () => {
  renderPosts();
  showToast("Feed atualizado.");
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    currentFilter = button.dataset.filter || "for-you";
    renderPosts();
  });
});

addStoryBtn?.addEventListener("click", () => {
  openStoryModal();
});

closeStoryModal?.addEventListener("click", () => {
  closeStory();
});

storyModal?.addEventListener("click", (event) => {
  if (event.target === storyModal) closeStory();
});

publishStoryBtn?.addEventListener("click", createStory);

/* =========================
   USUÁRIO
========================= */

async function loadCurrentUser() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    currentUserData = userSnap.exists() ? userSnap.data() : {};

    const username =
      currentUserData.username ||
      currentUser.email?.split("@")[0] ||
      "usuario";

    const displayName =
      currentUserData.displayName ||
      currentUserData.name ||
      username ||
      "Usuário Vinyl";

    const avatar =
      currentUserData.photoURL ||
      currentUserData.avatar ||
      currentUser.photoURL ||
      DEFAULT_AVATAR;

    setImg(navAvatar, avatar);
    setImg(sidebarAvatar, avatar);
    setImg(composerAvatar, avatar);

    setText(navUsername, username);
    setText(sidebarName, displayName);
    setText(sidebarUsername, `@${username}`);
  } catch (error) {
    console.error("Erro ao carregar usuário:", error);
  }
}

async function loadFollowing() {
  try {
    const followingQuery = query(
      collection(db, "follows"),
      where("followerId", "==", currentUser.uid),
      limit(100)
    );

    const snap = await getDocs(followingQuery);

    followingIds = snap.docs
      .map((item) => item.data().followingId)
      .filter(Boolean);

    setText(followingCount, String(followingIds.length));
  } catch (error) {
    console.warn("Erro ao carregar seguindo:", error);
    followingIds = [];
    setText(followingCount, "0");
  }
}

/* =========================
   CRIAR POST
========================= */

async function createPost() {
  const content = postText?.value.trim() || "";
  const spotify = spotifyLink?.value.trim() || "";
  const media = mediaUrl?.value.trim() || "";
  const type = postType?.value || "normal";
  const stars = rating?.value || "";

  if (!content && !spotify && !media) {
    showToast("Escreva algo ou adicione um link/mídia.");
    return;
  }

  try {
    publishPost.disabled = true;
    publishPost.textContent = "Publicando...";

    const username =
      currentUserData.username ||
      currentUser.email?.split("@")[0] ||
      "usuario";

    const displayName =
      currentUserData.displayName ||
      currentUserData.name ||
      username ||
      "Usuário Vinyl";

    const avatar =
      currentUserData.photoURL ||
      currentUserData.avatar ||
      currentUser.photoURL ||
      DEFAULT_AVATAR;

    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      userName: displayName,
      userUsername: username,
      userAvatar: avatar,

      content,
      spotifyUrl: spotify,
      imageUrl: media,
      postType: type,
      rating: stars ? Number(stars) : 0,

      likesCount: 0,
      repliesCount: 0,
      repostsCount: 0,
      deleted: false,
      edited: false,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    postText.value = "";
    spotifyLink.value = "";
    mediaUrl.value = "";
    postType.value = "normal";
    rating.value = "";

    showToast("Post publicado.");
  } catch (error) {
    console.error("Erro ao publicar post:", error);
    showToast("Não foi possível publicar. Verifique as regras do Firestore.");
  } finally {
    publishPost.disabled = false;
    publishPost.textContent = "Publicar";
  }
}

/* =========================
   LISTAR POSTS
========================= */

function listenPosts() {
  if (!feedList) return;

  if (unsubscribePosts) unsubscribePosts();

  const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(80)
  );

  unsubscribePosts = onSnapshot(
    postsQuery,
    async (snapshot) => {
      cachedPosts = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        .filter((post) => !post.deleted);

      setText(postCount, String(cachedPosts.filter((p) => p.userId === currentUser.uid).length));

      await hydrateUserInteractions();
      renderPosts();
    },
    (error) => {
      console.error("Erro ao carregar posts:", error);
      feedList.innerHTML = emptyState("Não foi possível carregar o Pulse.");
    }
  );
}

async function hydrateUserInteractions() {
  try {
    const checks = cachedPosts.map(async (post) => {
      const likeRef = doc(db, "posts", post.id, "likes", currentUser.uid);
      const repostRef = doc(db, "posts", post.id, "reposts", currentUser.uid);

      const [likeSnap, repostSnap] = await Promise.all([
        getDoc(likeRef),
        getDoc(repostRef)
      ]);

      post.likedByMe = likeSnap.exists();
      post.repostedByMe = repostSnap.exists();

      return post;
    });

    await Promise.all(checks);
  } catch (error) {
    console.warn("Erro ao carregar interações:", error);
  }
}

function renderPosts() {
  if (!feedList) return;

  let posts = [...cachedPosts];

  if (currentFilter === "following") {
    posts = posts.filter((post) => followingIds.includes(post.userId) || post.userId === currentUser.uid);
  }

  if (currentFilter === "reviews") {
    posts = posts.filter((post) => post.postType === "review" || Number(post.rating) > 0);
  }

  if (currentFilter === "listening") {
    posts = posts.filter((post) => post.postType === "listening");
  }

  if (!posts.length) {
    feedList.innerHTML = emptyState("Nenhum post encontrado nessa aba.");
    return;
  }

  feedList.innerHTML = posts.map(renderPostCard).join("");

  document.querySelectorAll("[data-like]").forEach((button) => {
    button.addEventListener("click", () => toggleLike(button.dataset.like));
  });

  document.querySelectorAll("[data-repost]").forEach((button) => {
    button.addEventListener("click", () => toggleRepost(button.dataset.repost));
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deletePost(button.dataset.delete));
  });

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => copyPostLink(button.dataset.copy));
  });
}

function renderPostCard(post) {
  const avatar = post.userAvatar || DEFAULT_AVATAR;
  const username = post.userUsername || "usuario";
  const name = post.userName || username;
  const date = formatDate(post.createdAt);
  const typeLabel = getPostTypeLabel(post.postType);
  const isOwner = post.userId === currentUser.uid;

  const ratingHTML = Number(post.rating) > 0
    ? `<div class="post-rating">${"★".repeat(Number(post.rating))}${"☆".repeat(5 - Number(post.rating))}</div>`
    : "";

  const mediaHTML = post.imageUrl
    ? `
      <div class="post-media">
        <img src="${escapeHTML(post.imageUrl)}" alt="Mídia do post" loading="lazy" onerror="this.parentElement.remove()">
      </div>
    `
    : "";

  const spotifyHTML = post.spotifyUrl
    ? `
      <a class="spotify-card" href="${escapeHTML(post.spotifyUrl)}" target="_blank" rel="noopener noreferrer">
        <span class="icon">♪</span>
        <div>
          <strong>${escapeHTML(getProviderName(post.spotifyUrl))}</strong>
          <span>${escapeHTML(post.spotifyUrl)}</span>
        </div>
      </a>
    `
    : "";

  return `
    <article class="post-card" id="post-${escapeHTML(post.id)}">
      <div class="post-top">
        <img class="post-avatar" src="${escapeHTML(avatar)}" alt="${escapeHTML(name)}" onerror="this.src='${DEFAULT_AVATAR}'">

        <div class="post-body">
          <div class="post-meta">
            <strong>${escapeHTML(name)}</strong>
            <span>@${escapeHTML(username)}</span>
            <span>·</span>
            <span>${date}</span>
            ${typeLabel ? `<span class="post-badge">${typeLabel}</span>` : ""}
          </div>

          ${post.content ? `<p class="post-text">${escapeHTML(post.content)}</p>` : ""}

          ${ratingHTML}
          ${mediaHTML}
          ${spotifyHTML}

          <div class="post-actions">
            <button class="${post.likedByMe ? "liked" : ""}" type="button" data-like="${escapeHTML(post.id)}">
              ♥ ${Number(post.likesCount || 0)}
            </button>

            <button class="${post.repostedByMe ? "liked" : ""}" type="button" data-repost="${escapeHTML(post.id)}">
              ↻ ${Number(post.repostsCount || 0)}
            </button>

            <button type="button" data-copy="${escapeHTML(post.id)}">
              Compartilhar
            </button>

            ${isOwner ? `
              <button type="button" data-delete="${escapeHTML(post.id)}">
                Excluir
              </button>
            ` : ""}
          </div>
        </div>
      </div>
    </article>
  `;
}

/* =========================
   LIKE / REPOST / DELETE
========================= */

async function toggleLike(postId) {
  try {
    const postRef = doc(db, "posts", postId);
    const likeRef = doc(db, "posts", postId, "likes", currentUser.uid);
    const likeSnap = await getDoc(likeRef);

    if (likeSnap.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(postRef, {
        likesCount: increment(-1)
      });
    } else {
      await setDoc(likeRef, {
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(postRef, {
        likesCount: increment(1)
      });
    }
  } catch (error) {
    console.error("Erro ao curtir:", error);
    showToast("Não foi possível curtir.");
  }
}

async function toggleRepost(postId) {
  try {
    const postRef = doc(db, "posts", postId);
    const repostRef = doc(db, "posts", postId, "reposts", currentUser.uid);
    const repostSnap = await getDoc(repostRef);

    if (repostSnap.exists()) {
      await deleteDoc(repostRef);
      await updateDoc(postRef, {
        repostsCount: increment(-1)
      });
    } else {
      await setDoc(repostRef, {
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(postRef, {
        repostsCount: increment(1)
      });
    }
  } catch (error) {
    console.error("Erro ao repostar:", error);
    showToast("Não foi possível repostar.");
  }
}

async function deletePost(postId) {
  const confirmed = confirm("Excluir esse post?");
  if (!confirmed) return;

  try {
    await updateDoc(doc(db, "posts", postId), {
      deleted: true,
      updatedAt: serverTimestamp()
    });

    showToast("Post removido.");
  } catch (error) {
    console.error("Erro ao excluir:", error);
    showToast("Não foi possível excluir.");
  }
}

async function copyPostLink(postId) {
  const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;

  try {
    await navigator.clipboard.writeText(url);
    showToast("Link copiado.");
  } catch {
    showToast("Não foi possível copiar o link.");
  }
}

/* =========================
   STORIES
========================= */

function listenStories() {
  if (!storiesList) return;

  if (unsubscribeStories) unsubscribeStories();

  const storiesQuery = query(
    collection(db, "stories"),
    orderBy("createdAt", "desc"),
    limit(30)
  );

  unsubscribeStories = onSnapshot(
    storiesQuery,
    (snapshot) => {
      cachedStories = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      renderStories();
    },
    (error) => {
      console.error("Erro ao carregar stories:", error);
      storiesList.innerHTML = `<div class="story-empty">Não foi possível carregar stories.</div>`;
    }
  );
}

function renderStories() {
  if (!storiesList) return;

  const ownAvatar =
    currentUserData.photoURL ||
    currentUserData.avatar ||
    currentUser?.photoURL ||
    DEFAULT_AVATAR;

  const storiesHTML = cachedStories
    .map((story) => {
      const avatar = story.userAvatar || DEFAULT_AVATAR;
      const username = story.userUsername || story.userName || "usuario";

      return `
        <button class="story-item" type="button" data-story="${escapeHTML(story.id)}">
          <span>
            <img src="${escapeHTML(avatar)}" alt="${escapeHTML(username)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">
          </span>
          <small>${escapeHTML(username)}</small>
        </button>
      `;
    })
    .join("");

  storiesList.innerHTML = `
    <button class="story-item add" type="button" id="storyAddInline">
      <span>+</span>
      <small>Seu story</small>
    </button>

    ${storiesHTML || `<div class="story-empty">Nenhum story ativo.</div>`}
  `;

  document.getElementById("storyAddInline")?.addEventListener("click", openStoryModal);

  document.querySelectorAll("[data-story]").forEach((button) => {
    button.addEventListener("click", () => {
      const story = cachedStories.find((item) => item.id === button.dataset.story);
      if (story) showStoryPreview(story);
    });
  });
}

function openStoryModal() {
  if (!storyModal) return;

  if (storyText) storyText.value = "";
  if (storyMediaUrl) storyMediaUrl.value = "";

  storyModal.classList.add("show");
}

function closeStory() {
  storyModal?.classList.remove("show");
}

async function createStory() {
  const text = storyText?.value.trim() || "";
  const media = storyMediaUrl?.value.trim() || "";

  if (!text && !media) {
    showToast("Adicione texto ou mídia no story.");
    return;
  }

  try {
    publishStoryBtn.disabled = true;
    publishStoryBtn.textContent = "Publicando...";

    const username =
      currentUserData.username ||
      currentUser.email?.split("@")[0] ||
      "usuario";

    const displayName =
      currentUserData.displayName ||
      currentUserData.name ||
      username ||
      "Usuário Vinyl";

    const avatar =
      currentUserData.photoURL ||
      currentUserData.avatar ||
      currentUser.photoURL ||
      DEFAULT_AVATAR;

    await addDoc(collection(db, "stories"), {
      userId: currentUser.uid,
      userName: displayName,
      userUsername: username,
      userAvatar: avatar,
      text,
      imageUrl: media,
      createdAt: serverTimestamp()
    });

    closeStory();
    showToast("Story publicado.");
  } catch (error) {
    console.error("Erro ao publicar story:", error);
    showToast("Não foi possível publicar story.");
  } finally {
    publishStoryBtn.disabled = false;
    publishStoryBtn.textContent = "Publicar story";
  }
}

function showStoryPreview(story) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay show";

  const image = story.imageUrl
    ? `<img src="${escapeHTML(story.imageUrl)}" alt="Story" style="width:100%;max-height:420px;object-fit:cover;border-radius:20px;margin:14px 0;">`
    : "";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <h2>@${escapeHTML(story.userUsername || "usuario")}</h2>
        <button type="button">×</button>
      </div>

      ${image}

      <p style="color:white;line-height:1.5;font-weight:800;">
        ${escapeHTML(story.text || "Story Vinyl")}
      </p>
    </div>
  `;

  modal.querySelector("button")?.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

/* =========================
   SUGESTÕES
========================= */

async function loadSuggestions() {
  if (!suggestionsList) return;

  try {
    const usersQuery = query(collection(db, "users"), limit(6));
    const snap = await getDocs(usersQuery);

    const users = snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .filter((user) => user.id !== currentUser.uid)
      .slice(0, 4);

    if (!users.length) return;

    suggestionsList.innerHTML = users.map((user) => {
      const username = user.username || user.name || "usuario";
      const name = user.displayName || user.name || username;
      const avatar = user.photoURL || user.avatar || DEFAULT_AVATAR;

      return `
        <article class="suggestion-item">
          <img src="${escapeHTML(avatar)}" alt="${escapeHTML(name)}" onerror="this.src='${DEFAULT_AVATAR}'">

          <div>
            <strong>${escapeHTML(name)}</strong>
            <small>@${escapeHTML(username)}</small>
          </div>

          <a href="profile.html?u=${encodeURIComponent(user.id)}" class="mini-btn">
            Ver
          </a>
        </article>
      `;
    }).join("");
  } catch (error) {
    console.warn("Erro ao carregar sugestões:", error);
  }
}

/* =========================
   UTILIDADES
========================= */

function getPostTypeLabel(type) {
  const labels = {
    normal: "",
    review: "Review",
    listening: "Ouvindo",
    recommendation: "Recomendação"
  };

  return labels[type] || "";
}

function getProviderName(url = "") {
  const clean = url.toLowerCase();

  if (clean.includes("spotify")) return "Spotify";
  if (clean.includes("youtube") || clean.includes("youtu.be")) return "YouTube";
  if (clean.includes("music.apple")) return "Apple Music";
  if (clean.includes("soundcloud")) return "SoundCloud";

  return "Link musical";
}

function formatDate(value) {
  if (!value) return "agora";

  const date = value.toDate ? value.toDate() : new Date(value);
  const diff = Date.now() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "agora";
  if (diff < hour) return `${Math.floor(diff / minute)}min`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  });
}

function setText(element, value) {
  if (element) element.textContent = value;
}

function setImg(element, src) {
  if (!element) return;

  element.src = src || DEFAULT_AVATAR;
  element.onerror = () => {
    element.src = DEFAULT_AVATAR;
  };
}

function showToast(message) {
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function emptyState(message) {
  return `
    <div class="post-card">
      <p class="post-text" style="text-align:center;color:rgba(255,255,255,.65);">
        ${escapeHTML(message)}
      </p>
    </div>
  `;
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}