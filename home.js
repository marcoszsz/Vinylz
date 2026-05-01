import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   ELEMENTOS
========================= */

const navbarLinks = document.getElementById("navbarLinks");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const logoutBtn = document.getElementById("logoutBtn");

const navbarAvatar = document.getElementById("navbarAvatar");
const navbarUsername = document.getElementById("navbarUsername");

const homeProfileAvatar = document.getElementById("homeProfileAvatar");
const homeDisplayName = document.getElementById("homeDisplayName");
const homeUsername = document.getElementById("homeUsername");
const homeFollowersCount = document.getElementById("homeFollowersCount");
const homeFollowingCount = document.getElementById("homeFollowingCount");

const composerAvatar = document.getElementById("composerAvatar");
const composerName = document.getElementById("composerName");

const postForm = document.getElementById("postForm");
const postInput = document.getElementById("postInput");
const publishPostBtn = document.getElementById("publishPostBtn");
const feedContainer = document.getElementById("feedContainer");
const feedFilter = document.getElementById("feedFilter");

const storiesList = document.getElementById("storiesList");
const createStoryBtn = document.getElementById("createStoryBtn");
const storyModal = document.getElementById("storyModal");
const closeStoryBackdrop = document.getElementById("closeStoryBackdrop");
const closeStoryModalBtn = document.getElementById("closeStoryModalBtn");
const storyForm = document.getElementById("storyForm");
const storyInput = document.getElementById("storyInput");

const notificationsModal = document.getElementById("notificationsModal");
const openNotificationsBtn = document.getElementById("openNotificationsBtn");
const openNotificationsBtnSide = document.getElementById("openNotificationsBtnSide");
const closeNotificationsBtn = document.getElementById("closeNotificationsBtn");
const closeNotificationsBackdrop = document.getElementById("closeNotificationsBackdrop");

const openChatWidgetBtn = document.getElementById("openChatWidgetBtn");
const closeChatWidgetBtn = document.getElementById("closeChatWidgetBtn");
const chatWidget = document.getElementById("chatWidget");

const suggestionsList = document.getElementById("suggestionsList");
const nowPlayingBox = document.getElementById("nowPlayingBox");
const toast = document.getElementById("toast");

const DEFAULT_AVATAR = "https://placehold.co/300x300/111111/ff4d6d?text=VINYL";

let currentUser = null;
let currentUserData = null;

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
  await loadStories();
  await loadFeed();
  await loadSuggestions();
});

/* =========================
   USUÁRIO ATUAL
========================= */

async function loadCurrentUser() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      window.location.href = "onboarding.html";
      return;
    }

    currentUserData = userSnap.data();

    renderCurrentUser(currentUserData);
  } catch (error) {
    console.error("Erro ao carregar usuário:", error);
    showMessage("Erro ao carregar dados do usuário.");
  }
}

function renderCurrentUser(data) {
  const displayName =
    data.displayName ||
    data.name ||
    data.username ||
    currentUser.displayName ||
    "Usuário Vinyl";

  const username =
    data.username ||
    "usuario";

  const photoURL =
    data.photoURL ||
    currentUser.photoURL ||
    DEFAULT_AVATAR;

  if (navbarAvatar) navbarAvatar.src = photoURL;
  if (navbarUsername) navbarUsername.textContent = username;

  if (homeProfileAvatar) homeProfileAvatar.src = photoURL;
  if (homeDisplayName) homeDisplayName.textContent = displayName;
  if (homeUsername) homeUsername.textContent = `@${username}`;

  if (composerAvatar) composerAvatar.src = photoURL;
  if (composerName) composerName.textContent = displayName;

  if (homeFollowersCount) {
    homeFollowersCount.textContent = Array.isArray(data.followers)
      ? data.followers.length
      : 0;
  }

  if (homeFollowingCount) {
    homeFollowingCount.textContent = Array.isArray(data.following)
      ? data.following.length
      : 0;
  }

  if (nowPlayingBox) {
    if (data.spotifyConnected) {
      nowPlayingBox.innerHTML = `
        <p class="empty-state">Spotify conectado.</p>
      `;
    } else {
      nowPlayingBox.innerHTML = `
        <p class="empty-state">Conecte seu Spotify para mostrar sua música atual.</p>
      `;
    }
  }
}

/* =========================
   MODAL NOTIFICAÇÕES
========================= */

function openNotifications() {
  if (!notificationsModal) return;
  notificationsModal.hidden = false;
}

function closeNotifications() {
  if (!notificationsModal) return;
  notificationsModal.hidden = true;
}

openNotificationsBtn?.addEventListener("click", openNotifications);
openNotificationsBtnSide?.addEventListener("click", openNotifications);
closeNotificationsBtn?.addEventListener("click", closeNotifications);
closeNotificationsBackdrop?.addEventListener("click", closeNotifications);

/* =========================
   POSTS / FEED
========================= */

postForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || !currentUserData) {
    showMessage("Você precisa estar logado.");
    return;
  }

  const text = postInput.value.trim();

  if (!text) {
    showMessage("Digite algo para publicar.");
    return;
  }

  try {
    if (publishPostBtn) {
      publishPostBtn.disabled = true;
      publishPostBtn.textContent = "Publicando...";
    }

    await addDoc(collection(db, "posts"), {
      uid: currentUser.uid,
      userId: currentUser.uid,
      authorUid: currentUser.uid,
      username: currentUserData.username || "",
      displayName: currentUserData.displayName || currentUserData.username || "Usuário Vinyl",
      photoURL: currentUserData.photoURL || DEFAULT_AVATAR,
      content: text,
      text,
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    postInput.value = "";
    showMessage("Post publicado.");
    await loadFeed();
  } catch (error) {
    console.error("Erro ao publicar post:", error);
    showMessage("Erro ao publicar post.");
  } finally {
    if (publishPostBtn) {
      publishPostBtn.disabled = false;
      publishPostBtn.textContent = "Publicar";
    }
  }
});

feedFilter?.addEventListener("change", () => {
  loadFeed();
});

async function loadFeed() {
  if (!feedContainer) return;

  feedContainer.innerHTML = `<p class="empty-state">Carregando feed...</p>`;

  try {
    const filter = feedFilter?.value || "recent";

    let postsQuery;

    if (filter === "recent") {
      postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(30)
      );
    } else if (filter === "popular") {
      postsQuery = query(
        collection(db, "posts"),
        orderBy("likesCount", "desc"),
        limit(30)
      );
    } else {
      postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(30)
      );
    }

    const snapshot = await getDocs(postsQuery);

    let posts = [];

    snapshot.forEach((docSnap) => {
      posts.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    if (filter === "following") {
      const following = Array.isArray(currentUserData?.following)
        ? currentUserData.following
        : [];

      posts = posts.filter((post) => {
        const authorUid = post.uid || post.userId || post.authorUid;
        return following.includes(authorUid) || authorUid === currentUser.uid;
      });
    }

    renderFeed(posts);
  } catch (error) {
    console.error("Erro ao carregar feed:", error);
    feedContainer.innerHTML = `<p class="empty-state">Erro ao carregar feed.</p>`;
  }
}

function renderFeed(posts) {
  if (!feedContainer) return;

  feedContainer.innerHTML = "";

  if (!posts.length) {
    feedContainer.innerHTML = `<p class="empty-state">Nenhum post por enquanto.</p>`;
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";

    const authorName =
      post.displayName ||
      post.username ||
      "Usuário Vinyl";

    const username =
      post.username ? `@${post.username}` : "@usuario";

    const avatar =
      post.photoURL ||
      DEFAULT_AVATAR;

    const content =
      post.content ||
      post.text ||
      "";

    card.innerHTML = `
      <header class="post-header">
        <img src="${escapeHTML(avatar)}" alt="Avatar" class="post-avatar">

        <div>
          <strong>${escapeHTML(authorName)}</strong>
          <span>${escapeHTML(username)}</span>
        </div>
      </header>

      <p class="post-content">${escapeHTML(content)}</p>

      <footer class="post-actions">
        <button type="button" data-action="like" data-post-id="${post.id}">
          ♡ ${Number(post.likesCount || 0)}
        </button>

        <button type="button" data-action="comment" data-post-id="${post.id}">
          💬 ${Number(post.commentsCount || 0)}
        </button>

        <button type="button" data-action="repost" data-post-id="${post.id}">
          🔁 ${Number(post.repostsCount || 0)}
        </button>
      </footer>
    `;

    feedContainer.appendChild(card);
  });
}

/* =========================
   STORIES
========================= */

function openStoryModal() {
  if (!storyModal) return;
  storyModal.hidden = false;
}

function closeStoryModal() {
  if (!storyModal) return;
  storyModal.hidden = true;
}

createStoryBtn?.addEventListener("click", openStoryModal);
closeStoryBackdrop?.addEventListener("click", closeStoryModal);
closeStoryModalBtn?.addEventListener("click", closeStoryModal);

storyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || !currentUserData) {
    showMessage("Você precisa estar logado.");
    return;
  }

  const text = storyInput.value.trim();

  if (!text) {
    showMessage("Digite algo para publicar no story.");
    return;
  }

  try {
    await addDoc(collection(db, "stories"), {
      uid: currentUser.uid,
      userId: currentUser.uid,
      authorUid: currentUser.uid,
      username: currentUserData.username || "",
      displayName: currentUserData.displayName || currentUserData.username || "Usuário Vinyl",
      photoURL: currentUserData.photoURL || DEFAULT_AVATAR,
      text,
      content: text,
      createdAt: serverTimestamp(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });

    storyInput.value = "";
    closeStoryModal();
    showMessage("Story publicado.");
    await loadStories();
  } catch (error) {
    console.error("Erro ao publicar story:", error);
    showMessage("Erro ao publicar story.");
  }
});

async function loadStories() {
  if (!storiesList) return;

  storiesList.innerHTML = `<div class="story-skeleton">Carregando stories...</div>`;

  try {
    const storiesQuery = query(
      collection(db, "stories"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const snapshot = await getDocs(storiesQuery);

    const stories = [];

    snapshot.forEach((docSnap) => {
      const story = {
        id: docSnap.id,
        ...docSnap.data()
      };

      if (story.expiresAt && story.expiresAt < Date.now()) {
        return;
      }

      stories.push(story);
    });

    renderStories(stories);
  } catch (error) {
    console.error("Erro ao carregar stories:", error);
    storiesList.innerHTML = `<p class="empty-state">Erro ao carregar stories.</p>`;
  }
}

function renderStories(stories) {
  if (!storiesList) return;

  storiesList.innerHTML = "";

  const myStory = document.createElement("button");
  myStory.className = "story-item create-story-item";
  myStory.type = "button";
  myStory.innerHTML = `
    <img src="${escapeHTML(currentUserData?.photoURL || DEFAULT_AVATAR)}" alt="Seu story">
    <span>Seu story</span>
  `;
  myStory.addEventListener("click", openStoryModal);
  storiesList.appendChild(myStory);

  if (!stories.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum story ainda.";
    storiesList.appendChild(empty);
    return;
  }

  stories.forEach((story) => {
    const item = document.createElement("button");
    item.className = "story-item";
    item.type = "button";

    item.innerHTML = `
      <img src="${escapeHTML(story.photoURL || DEFAULT_AVATAR)}" alt="Story">
      <span>${escapeHTML(story.username || "usuário")}</span>
    `;

    item.addEventListener("click", () => {
      showMessage(story.text || story.content || "Story");
    });

    storiesList.appendChild(item);
  });
}

/* =========================
   SUGESTÕES
========================= */

async function loadSuggestions() {
  if (!suggestionsList || !currentUser) return;

  suggestionsList.innerHTML = `<p class="empty-state">Carregando sugestões...</p>`;

  try {
    const usersQuery = query(
      collection(db, "users"),
      limit(6)
    );

    const snapshot = await getDocs(usersQuery);

    const users = [];

    snapshot.forEach((docSnap) => {
      if (docSnap.id === currentUser.uid) return;

      users.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    renderSuggestions(users);
  } catch (error) {
    console.error("Erro ao carregar sugestões:", error);
    suggestionsList.innerHTML = `<p class="empty-state">Erro ao carregar sugestões.</p>`;
  }
}

function renderSuggestions(users) {
  if (!suggestionsList) return;

  suggestionsList.innerHTML = "";

  if (!users.length) {
    suggestionsList.innerHTML = `<p class="empty-state">Nenhuma sugestão agora.</p>`;
    return;
  }

  users.forEach((user) => {
    const item = document.createElement("article");
    item.className = "suggestion-item";

    const name =
      user.displayName ||
      user.username ||
      "Usuário Vinyl";

    const username =
      user.username ? `@${user.username}` : "@usuario";

    const avatar =
      user.photoURL ||
      DEFAULT_AVATAR;

    item.innerHTML = `
      <img src="${escapeHTML(avatar)}" alt="Avatar">

      <div>
        <strong>${escapeHTML(name)}</strong>
        <span>${escapeHTML(username)}</span>
      </div>

      <a href="profile.html?uid=${encodeURIComponent(user.id)}">
        Ver
      </a>
    `;

    suggestionsList.appendChild(item);
  });
}

/* =========================
   CHAT WIDGET
========================= */

openChatWidgetBtn?.addEventListener("click", () => {
  if (!chatWidget) return;
  chatWidget.hidden = false;
});

closeChatWidgetBtn?.addEventListener("click", () => {
  if (!chatWidget) return;
  chatWidget.hidden = true;
});

/* =========================
   MENU MOBILE
========================= */

mobileMenuBtn?.addEventListener("click", () => {
  navbarLinks?.classList.toggle("active");
});

/* =========================
   LOGOUT
========================= */

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Erro ao sair:", error);
    showMessage("Erro ao sair da conta.");
  }
});

/* =========================
   HELPERS
========================= */

function showMessage(message) {
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}