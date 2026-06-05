import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===============================
   ELEMENTOS
================================ */

const navbarLinks = document.getElementById("navbarLinks");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const logoutBtn = document.getElementById("logoutBtn");

const navbarAvatar = document.getElementById("navbarAvatar");
const navbarUsername = document.getElementById("navbarUsername");

const sidebarAvatar = document.getElementById("sidebarAvatar");
const sidebarName = document.getElementById("sidebarName");
const sidebarUsername = document.getElementById("sidebarUsername");

const trendingPostsList = document.getElementById("trendingPostsList");
const reviewsList = document.getElementById("reviewsList");
const suggestionsList = document.getElementById("suggestionsList");
const activityList = document.getElementById("activityList");

const postModal = document.getElementById("postModal");
const postModalContent = document.getElementById("postModalContent");
const closePostModalBtn = document.getElementById("closePostModalBtn");
const closePostModalBackdrop = document.getElementById("closePostModalBackdrop");

const toast = document.getElementById("toast");

/* ===============================
   ESTADO
================================ */

const fallbackAvatar = "https://placehold.co/120x120/111111/ff4d6d?text=V";
const fallbackCover = "https://placehold.co/600x600/111111/ff4d6d?text=VINYL";

let currentUser = null;
let currentUserData = null;
let cachedPosts = [];

/* ===============================
   AUTH
================================ */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await loadCurrentUser();

  listenTrendingPosts();
  listenReviews();
  loadSuggestions();
  loadActivity();
});

/* ===============================
   NAVBAR
================================ */

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
      fallbackAvatar;

    if (navbarAvatar) navbarAvatar.src = avatar;
    if (navbarUsername) navbarUsername.textContent = username;

    if (sidebarAvatar) sidebarAvatar.src = avatar;
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarUsername) sidebarUsername.textContent = `@${username}`;

    navbarAvatar?.addEventListener("error", () => {
      navbarAvatar.src = fallbackAvatar;
    });

    sidebarAvatar?.addEventListener("error", () => {
      sidebarAvatar.src = fallbackAvatar;
    });
  } catch (error) {
    console.error("Erro ao carregar usuário:", error);
  }
}

/* ===============================
   POSTS EM ALTA
================================ */

function listenTrendingPosts() {
  if (!trendingPostsList) return;

  let postsQuery;

  try {
    postsQuery = query(
      collection(db, "posts"),
      orderBy("likesCount", "desc"),
      limit(8)
    );
  } catch {
    postsQuery = query(
      collection(db, "posts"),
      limit(8)
    );
  }

  onSnapshot(postsQuery, (snapshot) => {
    const posts = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    cachedPosts = posts;

    renderTrendingPosts(posts);
  }, (error) => {
    console.error("Erro ao carregar posts em alta:", error);

    listenTrendingPostsWithoutOrder();
  });
}

function listenTrendingPostsWithoutOrder() {
  if (!trendingPostsList) return;

  const postsQuery = query(
    collection(db, "posts"),
    limit(8)
  );

  onSnapshot(postsQuery, (snapshot) => {
    const posts = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    const sorted = posts.sort((a, b) => {
      const aScore = getInteractionCount(a);
      const bScore = getInteractionCount(b);

      return bScore - aScore;
    });

    cachedPosts = sorted;

    renderTrendingPosts(sorted);
  }, (error) => {
    console.error("Erro ao carregar posts sem order:", error);

    trendingPostsList.innerHTML = `
      <p class="empty-state">Não foi possível carregar os posts em alta.</p>
    `;
  });
}

function renderTrendingPosts(posts) {
  if (!trendingPostsList) return;

  if (!posts.length) {
    trendingPostsList.innerHTML = `
      <p class="empty-state">Nenhum post em alta ainda.</p>
    `;
    return;
  }

  trendingPostsList.innerHTML = posts.map((post) => renderTrendingPostCard(post)).join("");

  bindTrendingPostActions();
}

function renderTrendingPostCard(post) {
  const content = post.content || post.text || post.caption || "Post com mídia";
  const spotifyUrl = extractSpotifyUrl(content) || extractSpotifyUrl(post.url || "");
  const cleanedContent = removeRawSpotifyUrl(content);
  const interactionCount = getInteractionCount(post);

  const mediaHTML = renderPostMedia(post);

  return `
    <article class="trending-post-card" data-open-post="${safeText(post.id)}">
      <header class="trending-post-top">
        <img
          src="${safeText(post.userAvatar || post.avatar || fallbackAvatar)}"
          alt="${safeText(post.userName || "Usuário")}"
        />

        <div class="trending-post-user">
          <strong>${safeText(post.userName || post.displayName || "Usuário Vinyl")}</strong>
          <span>@${safeText(post.userUsername || post.username || "usuario")} · ${formatPostDate(post.createdAt)}</span>
        </div>
      </header>

      <p class="trending-post-content">
        ${safeText(shortenText(cleanedContent || "Post com mídia", 180))}
      </p>

      ${mediaHTML}

      ${
        spotifyUrl
          ? `
            <div class="trending-spotify-preview">
              <div class="trending-spotify-icon">♪</div>

              <div>
                <strong>Link do Spotify</strong>
                <span>${safeText(spotifyUrl)}</span>
              </div>
            </div>
          `
          : ""
      }

      <footer class="trending-post-actions">
        <button type="button" data-like-post="${safeText(post.id)}">
          ♡ ${post.likesCount || 0}
        </button>

        <a href="timeline.html?post=${encodeURIComponent(post.id)}">
          💬 ${post.repliesCount || 0}
        </a>

        <button type="button" data-repost-post="${safeText(post.id)}">
          🔁 ${post.repostsCount || 0}
        </button>

        <button type="button" data-open-modal="${safeText(post.id)}" class="primary-action">
          Abrir post
        </button>

        <span>${interactionCount} interações</span>
      </footer>
    </article>
  `;
}

function renderPostMedia(post) {
  const imageUrl =
    post.imageUrl ||
    post.mediaUrl ||
    post.image ||
    post.photoURL ||
    post.cover ||
    "";

  const videoUrl =
    post.videoUrl ||
    "";

  if (videoUrl) {
    return `
      <div class="trending-post-media">
        <video src="${safeText(videoUrl)}" controls></video>
      </div>
    `;
  }

  if (imageUrl) {
    return `
      <div class="trending-post-media">
        <img src="${safeText(imageUrl)}" alt="Mídia do post">
      </div>
    `;
  }

  return "";
}

function bindTrendingPostActions() {
  document.querySelectorAll("[data-open-post]").forEach((card) => {
    card.addEventListener("click", (event) => {
      const clickedAction = event.target.closest("button, a");

      if (clickedAction) return;

      const postId = card.dataset.openPost;
      openPostModal(postId);
    });
  });

  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      const postId = button.dataset.openModal;
      openPostModal(postId);
    });
  });

  document.querySelectorAll("[data-like-post]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();

      const postId = button.dataset.likePost;
      await likeTrendingPost(postId);
    });
  });

  document.querySelectorAll("[data-repost-post]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();

      const postId = button.dataset.repostPost;
      await repostTrendingPost(postId);
    });
  });
}

async function likeTrendingPost(postId) {
  if (!postId) return;

  try {
    await updateDoc(doc(db, "posts", postId), {
      likesCount: increment(1)
    });

    showToast("Post curtido.");
  } catch (error) {
    console.error("Erro ao curtir:", error);
    showToast("Não foi possível curtir.");
  }
}

async function repostTrendingPost(postId) {
  if (!postId) return;

  try {
    await updateDoc(doc(db, "posts", postId), {
      repostsCount: increment(1)
    });

    showToast("Post republicado.");
  } catch (error) {
    console.error("Erro ao republicar:", error);
    showToast("Não foi possível republicar.");
  }
}

function openPostModal(postId) {
  const post = cachedPosts.find((item) => item.id === postId);

  if (!post || !postModal || !postModalContent) {
    window.location.href = `timeline.html?post=${encodeURIComponent(postId)}`;
    return;
  }

  const content = post.content || post.text || post.caption || "Post com mídia";
  const spotifyUrl = extractSpotifyUrl(content) || extractSpotifyUrl(post.url || "");
  const cleanedContent = removeRawSpotifyUrl(content);
  const mediaHTML = renderPostMedia(post);
  const interactionCount = getInteractionCount(post);

  postModalContent.innerHTML = `
    <article class="modal-post-body">
      <header class="trending-post-top">
        <img
          src="${safeText(post.userAvatar || post.avatar || fallbackAvatar)}"
          alt="${safeText(post.userName || "Usuário")}"
        />

        <div class="trending-post-user">
          <strong>${safeText(post.userName || post.displayName || "Usuário Vinyl")}</strong>
          <span>@${safeText(post.userUsername || post.username || "usuario")} · ${formatPostDate(post.createdAt)}</span>
        </div>
      </header>

      <p class="trending-post-content">
        ${safeText(cleanedContent || "Post com mídia")}
      </p>

      ${mediaHTML}

      ${
        spotifyUrl
          ? `
            <div class="trending-spotify-preview">
              <div class="trending-spotify-icon">♪</div>

              <div>
                <strong>Link do Spotify</strong>
                <span>${safeText(spotifyUrl)}</span>
              </div>
            </div>
          `
          : ""
      }

      <footer class="trending-post-actions">
        <button type="button" data-like-modal="${safeText(post.id)}">
          ♡ ${post.likesCount || 0}
        </button>

        <a href="timeline.html?post=${encodeURIComponent(post.id)}">
          💬 Responder
        </a>

        <button type="button" data-repost-modal="${safeText(post.id)}">
          🔁 Republicar
        </button>

        <a class="primary-action" href="timeline.html?post=${encodeURIComponent(post.id)}">
          Abrir na timeline
        </a>

        <span>${interactionCount} interações</span>
      </footer>
    </article>
  `;

  postModal.hidden = false;

  postModalContent.querySelector("[data-like-modal]")?.addEventListener("click", async () => {
    await likeTrendingPost(post.id);
  });

  postModalContent.querySelector("[data-repost-modal]")?.addEventListener("click", async () => {
    await repostTrendingPost(post.id);
  });
}

function closePostModal() {
  if (!postModal) return;

  postModal.hidden = true;
}

closePostModalBtn?.addEventListener("click", closePostModal);
closePostModalBackdrop?.addEventListener("click", closePostModal);

/* ===============================
   REVIEWS
================================ */

function listenReviews() {
  if (!reviewsList) return;

  const reviewsQuery = query(
    collection(db, "reviews"),
    limit(4)
  );

  onSnapshot(reviewsQuery, (snapshot) => {
    const reviews = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderReviews(reviews);
  }, (error) => {
    console.warn("Erro ao carregar reviews:", error);

    reviewsList.innerHTML = `
      <p class="empty-state">Nenhuma review em destaque ainda.</p>
    `;
  });
}

function renderReviews(reviews) {
  if (!reviewsList) return;

  if (!reviews.length) {
    reviewsList.innerHTML = `
      <p class="empty-state">Nenhuma review em destaque ainda.</p>
    `;
    return;
  }

  reviewsList.innerHTML = reviews.map((review) => `
    <article class="review-card">
      <strong>${safeText(review.title || review.itemTitle || "Review musical")}</strong>
      <p>${safeText(shortenText(review.text || review.content || "Sem texto.", 160))}</p>
      <span>${renderStars(review.rating || 5)} · ${safeText(review.userName || "Usuário Vinyl")}</span>
    </article>
  `).join("");
}

function renderStars(rating) {
  const value = Math.max(1, Math.min(5, Number(rating || 5)));
  return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
}

/* ===============================
   SUGESTÕES
================================ */

async function loadSuggestions() {
  if (!suggestionsList || !currentUser) return;

  try {
    const snap = await getDocs(query(collection(db, "users"), limit(8)));

    const users = snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .filter((user) => user.id !== currentUser.uid)
      .slice(0, 5);

    if (!users.length) {
      suggestionsList.innerHTML = `
        <p class="empty-state">Nenhuma sugestão por enquanto.</p>
      `;
      return;
    }

    suggestionsList.innerHTML = users.map((user) => {
      const name = user.displayName || user.name || user.username || "Usuário Vinyl";
      const username = user.username || "usuario";
      const avatar = user.photoURL || user.avatar || fallbackAvatar;

      return `
        <div class="suggestion-item">
          <img src="${safeText(avatar)}" alt="${safeText(name)}">

          <div>
            <strong>${safeText(name)}</strong>
            <span>@${safeText(username)}</span>
          </div>

          <a href="public-profile.html?uid=${encodeURIComponent(user.id)}">
            Ver
          </a>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Erro ao carregar sugestões:", error);

    suggestionsList.innerHTML = `
      <p class="empty-state">Erro ao carregar sugestões.</p>
    `;
  }
}

/* ===============================
   ATIVIDADE
================================ */

async function loadActivity() {
  if (!activityList) return;

  try {
    const snap = await getDocs(query(collection(db, "posts"), limit(5)));

    const posts = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    if (!posts.length) {
      activityList.innerHTML = `
        <p class="empty-state">Nenhuma atividade recente.</p>
      `;
      return;
    }

    activityList.innerHTML = posts.slice(0, 4).map((post) => `
      <div class="activity-item">
        <img src="${safeText(post.userAvatar || post.avatar || fallbackAvatar)}" alt="Avatar">

        <div>
          <strong>${safeText(post.userName || "Usuário Vinyl")}</strong>
          <span>postou ${formatPostDate(post.createdAt)}</span>
        </div>
      </div>
    `).join("");
  } catch (error) {
    console.error("Erro ao carregar atividade:", error);

    activityList.innerHTML = `
      <p class="empty-state">Erro ao carregar atividade.</p>
    `;
  }
}

/* ===============================
   HELPERS
================================ */

function getInteractionCount(post) {
  return (
    Number(post.likesCount || 0) +
    Number(post.repliesCount || 0) +
    Number(post.repostsCount || 0) +
    Number(post.commentsCount || 0)
  );
}

function extractSpotifyUrl(text = "") {
  const match = String(text).match(/https?:\/\/open\.spotify\.com\/[^\s]+/i);
  return match ? match[0] : "";
}

function removeRawSpotifyUrl(text = "") {
  return String(text).replace(/https?:\/\/open\.spotify\.com\/[^\s]+/gi, "").trim();
}

function shortenText(text = "", max = 160) {
  const clean = String(text || "").trim();

  if (clean.length <= max) return clean;

  return `${clean.slice(0, max).trim()}...`;
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

function safeText(value, fallback = "") {
  return String(value || fallback)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  }, 2700);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePostModal();
  }
});