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
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  increment,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ELEMENTOS */

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
const postCounter = document.getElementById("postCounter");
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

const storyViewerModal = document.getElementById("storyViewerModal");
const closeStoryViewerBackdrop = document.getElementById("closeStoryViewerBackdrop");
const closeStoryViewerBtn = document.getElementById("closeStoryViewerBtn");
const storyViewerAvatar = document.getElementById("storyViewerAvatar");
const storyViewerName = document.getElementById("storyViewerName");
const storyViewerTime = document.getElementById("storyViewerTime");
const storyViewerText = document.getElementById("storyViewerText");
const storyViewerMusic = document.getElementById("storyViewerMusic");
const storyViewerMusicTitle = document.getElementById("storyViewerMusicTitle");
const storyViewerMusicArtist = document.getElementById("storyViewerMusicArtist");
const storyProgressBar = document.getElementById("storyProgressBar");
const prevStoryBtn = document.getElementById("prevStoryBtn");
const nextStoryBtn = document.getElementById("nextStoryBtn");

const notificationBadge = document.getElementById("notificationBadge");
const openNotificationsBtn = document.getElementById("openNotificationsBtn");
const openNotificationsBtnSide = document.getElementById("openNotificationsBtnSide");
const notificationsModal = document.getElementById("notificationsModal");
const closeNotificationsBackdrop = document.getElementById("closeNotificationsBackdrop");
const closeNotificationsBtn = document.getElementById("closeNotificationsBtn");
const notificationsList = document.getElementById("notificationsList");
const miniNotificationsList = document.getElementById("miniNotificationsList");

const suggestionsList = document.getElementById("suggestionsList");
const nowPlayingBox = document.getElementById("nowPlayingBox");
const popularReviewsBox = document.getElementById("popularReviewsBox");

const openMessagesBtn = document.getElementById("openMessagesBtn");
const closeChatWidgetBtn = document.getElementById("closeChatWidgetBtn");
const closeChatWidgetBackdrop = document.getElementById("closeChatWidgetBackdrop");
const chatWidget = document.getElementById("chatWidget");
const chatWidgetList = document.getElementById("chatWidgetList");
const chatSearchInput = document.getElementById("chatSearchInput");

const toast = document.getElementById("toast");

const heroPostsCount = document.getElementById("heroPostsCount");
const heroUsersCount = document.getElementById("heroUsersCount");
const heroSongsCount = document.getElementById("heroSongsCount");

/* MUSIC PICKER */

const addMusicBtn = document.getElementById("addMusicBtn");
const musicPickerModal = document.getElementById("musicPickerModal");
const closeMusicPickerBtn = document.getElementById("closeMusicPickerBtn");
const closeMusicPickerBackdrop = document.getElementById("closeMusicPickerBackdrop");
const musicPickerInput = document.getElementById("musicPickerInput");
const musicPickerSearchBtn = document.getElementById("musicPickerSearchBtn");
const musicPickerResults = document.getElementById("musicPickerResults");

const attachedMusicPreview = document.getElementById("attachedMusicPreview");
const attachedMusicImage = document.getElementById("attachedMusicImage");
const attachedMusicType = document.getElementById("attachedMusicType");
const attachedMusicTitle = document.getElementById("attachedMusicTitle");
const attachedMusicSubtitle = document.getElementById("attachedMusicSubtitle");
const removeAttachedMusicBtn = document.getElementById("removeAttachedMusicBtn");

/* ESTADO */

let currentUser = null;
let currentUserData = null;
let attachedMusic = null;
let selectedMusicType = "track";
let currentNotificationFilter = "all";

let storiesCache = [];
let activeStoryIndex = 0;
let storyTimer = null;
let unsubscribeFeed = null;
let unsubscribeNotifications = null;

const fallbackAvatar = "https://placehold.co/300x300/111111/ff4d6d?text=V";
const fallbackCover = "https://placehold.co/300x300/111111/ff4d6d?text=♪";

/* HELPERS */

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function safeText(value, fallback = "") {
  return String(value || fallback)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
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

function getUserDisplayName(userData, user) {
  return userData?.displayName || userData?.name || user?.displayName || "Usuário";
}

function getUserUsername(userData, user) {
  return userData?.username || user?.email?.split("@")[0] || "usuario";
}

function getUserAvatar(userData, user) {
  return userData?.photoURL || userData?.avatar || user?.photoURL || fallbackAvatar;
}

function getTypeLabel(type) {
  const labels = {
    track: "Música",
    album: "Álbum",
    artist: "Artista"
  };

  return labels[type] || "Música";
}

/* NAVBAR */

mobileMenuBtn?.addEventListener("click", () => {
  navbarLinks?.classList.toggle("open");
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    showToast("Erro ao sair da conta.");
  }
});

/* AUTH */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await loadCurrentUser();

  listenStories();
  listenFeed();
  listenNotifications();

  loadSuggestions();
  loadStats();
  loadNowPlaying();
  loadPopularReviews();
  loadChatWidget();
});

/* USER */

async function loadCurrentUser() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    currentUserData = userSnap.exists() ? userSnap.data() : {};

    const displayName = getUserDisplayName(currentUserData, currentUser);
    const username = getUserUsername(currentUserData, currentUser);
    const avatar = getUserAvatar(currentUserData, currentUser);

    if (navbarAvatar) navbarAvatar.src = avatar;
    if (navbarUsername) navbarUsername.textContent = username;

    if (homeProfileAvatar) homeProfileAvatar.src = avatar;
    if (homeDisplayName) homeDisplayName.textContent = displayName;
    if (homeUsername) homeUsername.textContent = `@${username}`;

    if (composerAvatar) composerAvatar.src = avatar;
    if (composerName) composerName.textContent = displayName;

    if (homeFollowersCount) {
      homeFollowersCount.textContent =
        currentUserData.followersCount ?? currentUserData.followers?.length ?? 0;
    }

    if (homeFollowingCount) {
      homeFollowingCount.textContent =
        currentUserData.followingCount ?? currentUserData.following?.length ?? 0;
    }
  } catch (error) {
    console.error("Erro ao carregar usuário:", error);
    showToast("Não foi possível carregar seu perfil.");
  }
}

/* POST COUNTER */

postInput?.addEventListener("input", () => {
  if (postCounter) {
    postCounter.textContent = postInput.value.length;
  }
});

/* MUSIC PICKER */

function openMusicPicker() {
  if (!musicPickerModal) return;

  musicPickerModal.hidden = false;

  setTimeout(() => {
    musicPickerInput?.focus();
  }, 80);
}

function closeMusicPicker() {
  if (!musicPickerModal) return;

  musicPickerModal.hidden = true;
}

function setAttachedMusic(item) {
  attachedMusic = item;

  if (!attachedMusicPreview) return;

  attachedMusicImage.src = item.image || fallbackCover;
  attachedMusicType.textContent = getTypeLabel(item.type);
  attachedMusicTitle.textContent = item.title || "Sem título";
  attachedMusicSubtitle.textContent = item.subtitle || "Desconhecido";

  attachedMusicPreview.hidden = false;
  closeMusicPicker();
}

function removeAttachedMusic() {
  attachedMusic = null;

  if (attachedMusicPreview) attachedMusicPreview.hidden = true;
  if (attachedMusicImage) attachedMusicImage.src = fallbackCover;
  if (attachedMusicTitle) attachedMusicTitle.textContent = "";
  if (attachedMusicSubtitle) attachedMusicSubtitle.textContent = "";
}

function renderMusicResults(items) {
  if (!musicPickerResults) return;

  if (!items.length) {
    musicPickerResults.innerHTML = `
      <p class="empty-state">Nada encontrado. Tente outro nome.</p>
    `;
    return;
  }

  musicPickerResults.innerHTML = items.map((item, index) => `
    <button
      type="button"
      class="music-result-card"
      data-index="${index}"
    >
      <img src="${safeText(item.image || fallbackCover)}" alt="${safeText(item.title || "Capa")}">

      <div class="music-result-info">
        <strong>${safeText(item.title || "Sem título")}</strong>
        <span>${safeText(item.subtitle || "Desconhecido")}</span>
      </div>

      <span class="music-result-pill">${getTypeLabel(item.type)}</span>
    </button>
  `).join("");

  document.querySelectorAll(".music-result-card").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const item = items[index];

      if (item) {
        setAttachedMusic(item);
      }
    });
  });
}

async function searchMusic() {
  const queryText = musicPickerInput?.value.trim();

  if (!queryText) {
    musicPickerResults.innerHTML = `
      <p class="empty-state">Digite o nome de uma música, álbum ou artista.</p>
    `;
    return;
  }

  musicPickerResults.innerHTML = `
    <p class="empty-state">Buscando no Spotify...</p>
  `;

  try {
    const response = await fetch(
      `/api/spotifySearch?q=${encodeURIComponent(queryText)}&type=${selectedMusicType}`
    );

    if (!response.ok) {
      throw new Error("Erro ao buscar no Spotify.");
    }

    const data = await response.json();
    const items = normalizeSpotifyResults(data, selectedMusicType);

    renderMusicResults(items);
  } catch (error) {
    console.warn("Busca real indisponível, usando demo:", error);

    const demoItems = getDemoMusicResults(queryText, selectedMusicType);
    renderMusicResults(demoItems);
  }
}

function normalizeSpotifyResults(data, type) {
  if (type === "track") {
    const tracks = data?.tracks?.items || data?.items || [];

    return tracks.map((track) => ({
      id: track.id,
      type: "track",
      title: track.name,
      subtitle: track.artists?.map((artist) => artist.name).join(", ") || "Artista desconhecido",
      image: track.album?.images?.[0]?.url || fallbackCover,
      spotifyUrl: track.external_urls?.spotify || null
    }));
  }

  if (type === "album") {
    const albums = data?.albums?.items || data?.items || [];

    return albums.map((album) => ({
      id: album.id,
      type: "album",
      title: album.name,
      subtitle: album.artists?.map((artist) => artist.name).join(", ") || "Artista desconhecido",
      image: album.images?.[0]?.url || fallbackCover,
      spotifyUrl: album.external_urls?.spotify || null
    }));
  }

  if (type === "artist") {
    const artists = data?.artists?.items || data?.items || [];

    return artists.map((artist) => ({
      id: artist.id,
      type: "artist",
      title: artist.name,
      subtitle: `${artist.followers?.total?.toLocaleString("pt-BR") || 0} seguidores no Spotify`,
      image: artist.images?.[0]?.url || fallbackCover,
      spotifyUrl: artist.external_urls?.spotify || null
    }));
  }

  return [];
}

function getDemoMusicResults(queryText, type) {
  const demo = {
    track: [
      {
        id: "demo-track-1",
        type: "track",
        title: queryText,
        subtitle: "Artista exemplo",
        image: "https://placehold.co/300x300/19191f/ff4d6d?text=TRACK",
        spotifyUrl: null
      },
      {
        id: "demo-track-2",
        type: "track",
        title: `${queryText} - Remix`,
        subtitle: "Vinyl Demo",
        image: "https://placehold.co/300x300/19191f/ff4d6d?text=REMIX",
        spotifyUrl: null
      }
    ],
    album: [
      {
        id: "demo-album-1",
        type: "album",
        title: queryText,
        subtitle: "Álbum exemplo",
        image: "https://placehold.co/300x300/19191f/ff4d6d?text=ALBUM",
        spotifyUrl: null
      }
    ],
    artist: [
      {
        id: "demo-artist-1",
        type: "artist",
        title: queryText,
        subtitle: "Artista exemplo",
        image: "https://placehold.co/300x300/19191f/ff4d6d?text=ARTIST",
        spotifyUrl: null
      }
    ]
  };

  return demo[type] || [];
}

document.querySelectorAll(".music-picker-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".music-picker-tabs button").forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");
    selectedMusicType = button.dataset.musicType || "track";

    if (musicPickerInput?.value.trim()) {
      searchMusic();
    }
  });
});

addMusicBtn?.addEventListener("click", openMusicPicker);
closeMusicPickerBtn?.addEventListener("click", closeMusicPicker);
closeMusicPickerBackdrop?.addEventListener("click", closeMusicPicker);
musicPickerSearchBtn?.addEventListener("click", searchMusic);
removeAttachedMusicBtn?.addEventListener("click", removeAttachedMusic);

musicPickerInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchMusic();
  }

  if (event.key === "Escape") {
    closeMusicPicker();
  }
});

/* CREATE POST */

postForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const content = postInput.value.trim();

  if (!content && !attachedMusic) {
    showToast("Escreva algo ou anexe uma música.");
    return;
  }

  publishPostBtn.disabled = true;
  publishPostBtn.textContent = "Publicando...";

  try {
    const postData = {
      userId: currentUser.uid,
      userName: getUserDisplayName(currentUserData, currentUser),
      userUsername: getUserUsername(currentUserData, currentUser),
      userAvatar: getUserAvatar(currentUserData, currentUser),
      content,
      music: attachedMusic ? {
        id: attachedMusic.id || null,
        type: attachedMusic.type || "track",
        title: attachedMusic.title || "",
        subtitle: attachedMusic.subtitle || "",
        image: attachedMusic.image || "",
        spotifyUrl: attachedMusic.spotifyUrl || null
      } : null,
      imageUrl: null,
      likesCount: 0,
      repliesCount: 0,
      repostsCount: 0,
      savesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await addDoc(collection(db, "posts"), postData);

    postInput.value = "";
    if (postCounter) postCounter.textContent = "0";
    removeAttachedMusic();

    showToast("Post publicado!");
  } catch (error) {
    console.error("Erro ao publicar:", error);
    showToast("Não foi possível publicar.");
  } finally {
    publishPostBtn.disabled = false;
    publishPostBtn.textContent = "Publicar";
  }
});

/* FEED */

function listenFeed() {
  if (!feedContainer) return;

  if (unsubscribeFeed) {
    unsubscribeFeed();
    unsubscribeFeed = null;
  }

  let postsQuery;
  const filter = feedFilter?.value || "recent";

  try {
    if (filter === "popular") {
      postsQuery = query(
        collection(db, "posts"),
        orderBy("likesCount", "desc"),
        limit(20)
      );
    } else {
      postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(30)
      );
    }

    unsubscribeFeed = onSnapshot(postsQuery, (snapshot) => {
      const posts = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      if (filter === "following" && currentUserData?.following?.length) {
        const followingIds = currentUserData.following;
        renderFeed(posts.filter((post) => followingIds.includes(post.userId)));
        return;
      }

      renderFeed(posts);
    }, (error) => {
      console.error("Erro ao carregar feed:", error);
      feedContainer.innerHTML = `
        <p class="empty-state">Erro ao carregar feed. Verifique as permissões do Firestore.</p>
      `;
    });
  } catch (error) {
    console.error("Erro no feed:", error);
  }
}

function renderFeed(posts) {
  if (!feedContainer) return;

  if (!posts.length) {
    feedContainer.innerHTML = `
      <p class="empty-state">Nenhum post por enquanto.</p>
    `;
    return;
  }

  feedContainer.innerHTML = posts.map(renderPostCard).join("");

  document.querySelectorAll("[data-like-post]").forEach((button) => {
    button.addEventListener("click", () => likePost(button.dataset.likePost));
  });

  document.querySelectorAll("[data-delete-post]").forEach((button) => {
    button.addEventListener("click", () => deletePostById(button.dataset.deletePost));
  });
}

function renderPostCard(post) {
  const isOwner = post.userId === currentUser?.uid;

  const musicHTML = post.music ? `
    <div class="post-music-card">
      <img src="${safeText(post.music.image || fallbackCover)}" alt="${safeText(post.music.title || "Capa")}">

      <div>
        <span>${getTypeLabel(post.music.type)}</span>
        <strong>${safeText(post.music.title || "Sem título")}</strong>
        <p>${safeText(post.music.subtitle || "Desconhecido")}</p>
      </div>

      ${post.music.spotifyUrl ? `
        <a href="${safeText(post.music.spotifyUrl)}" target="_blank" rel="noopener noreferrer">
          Abrir
        </a>
      ` : ""}
    </div>
  ` : "";

  return `
    <article class="post-card">
      <header class="post-header">
        <img src="${safeText(post.userAvatar || fallbackAvatar)}" alt="${safeText(post.userName || "Usuário")}">

        <div class="post-user">
          <strong>${safeText(post.userName || "Usuário")}</strong>
          <span>@${safeText(post.userUsername || "usuario")} · ${formatDate(post.createdAt)}</span>
        </div>
      </header>

      ${post.content ? `
        <p class="post-content">${safeText(post.content)}</p>
      ` : ""}

      ${musicHTML}

      <footer class="post-actions">
        <button type="button" data-like-post="${post.id}">
          ♡ ${post.likesCount || 0}
        </button>

        <button type="button">
          💬 ${post.repliesCount || 0}
        </button>

        <button type="button">
          🔁 ${post.repostsCount || 0}
        </button>

        <button type="button">
          🔖
        </button>

        ${isOwner ? `
          <button type="button" data-delete-post="${post.id}">
            🗑️
          </button>
        ` : ""}
      </footer>
    </article>
  `;
}

async function likePost(postId) {
  if (!postId) return;

  try {
    await updateDoc(doc(db, "posts", postId), {
      likesCount: increment(1)
    });
  } catch (error) {
    console.error("Erro ao curtir:", error);
    showToast("Não foi possível curtir.");
  }
}

async function deletePostById(postId) {
  if (!postId) return;

  const confirmDelete = confirm("Apagar esse post?");

  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "posts", postId));
    showToast("Post apagado.");
  } catch (error) {
    console.error("Erro ao apagar post:", error);
    showToast("Não foi possível apagar.");
  }
}

feedFilter?.addEventListener("change", () => {
  listenFeed();
});

/* STORIES */

function openStoryModal() {
  if (storyModal) {
    storyModal.hidden = false;
    setTimeout(() => storyInput?.focus(), 80);
  }
}

function closeStoryModal() {
  if (storyModal) {
    storyModal.hidden = true;
  }
}

createStoryBtn?.addEventListener("click", openStoryModal);
closeStoryBackdrop?.addEventListener("click", closeStoryModal);
closeStoryModalBtn?.addEventListener("click", closeStoryModal);

storyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const text = storyInput.value.trim();

  if (!text) {
    showToast("Escreva algo no story.");
    return;
  }

  try {
    await addDoc(collection(db, "stories"), {
      userId: currentUser.uid,
      userName: getUserDisplayName(currentUserData, currentUser),
      userUsername: getUserUsername(currentUserData, currentUser),
      userAvatar: getUserAvatar(currentUserData, currentUser),
      text,
      music: attachedMusic ? {
        id: attachedMusic.id || null,
        type: attachedMusic.type || "track",
        title: attachedMusic.title || "",
        subtitle: attachedMusic.subtitle || "",
        image: attachedMusic.image || "",
        spotifyUrl: attachedMusic.spotifyUrl || null
      } : null,
      createdAt: serverTimestamp()
    });

    storyInput.value = "";
    closeStoryModal();
    showToast("Story publicado!");
  } catch (error) {
    console.error("Erro ao postar story:", error);
    showToast("Não foi possível postar story.");
  }
});

function listenStories() {
  if (!storiesList) return;

  const storiesQuery = query(
    collection(db, "stories"),
    orderBy("createdAt", "desc"),
    limit(15)
  );

  onSnapshot(storiesQuery, (snapshot) => {
    const stories = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderStories(stories);
  }, (error) => {
    console.error("Erro ao carregar stories:", error);
    storiesList.innerHTML = `<p class="empty-state">Erro ao carregar stories.</p>`;
  });
}

function renderStories(stories) {
  if (!storiesList) return;

  storiesCache = [
    {
      id: "own-story",
      userId: currentUser?.uid,
      userName: "Seu story",
      userUsername: "Você",
      userAvatar: getUserAvatar(currentUserData, currentUser),
      text: "Toque em + Story para compartilhar sua vibe musical.",
      createdAt: null,
      isOwnPlaceholder: true
    },
    ...stories
  ];

  storiesList.innerHTML = storiesCache.map((story, index) => `
    <div class="story-item" data-story-index="${index}">
      <div class="story-avatar">
        <img src="${safeText(story.userAvatar || fallbackAvatar)}" alt="${safeText(story.userName || "Story")}">
      </div>

      <span>${safeText(story.userUsername || story.userName || "usuário")}</span>
    </div>
  `).join("");

  document.querySelectorAll("[data-story-index]").forEach((item) => {
    item.addEventListener("click", () => {
      const index = Number(item.dataset.storyIndex);

      if (storiesCache[index]?.isOwnPlaceholder) {
        openStoryModal();
        return;
      }

      openStoryViewer(index);
    });
  });
}

/* STORY VIEWER */

function openStoryViewer(index = 0) {
  if (!storyViewerModal || !storiesCache.length) return;

  activeStoryIndex = index;
  storyViewerModal.hidden = false;

  renderActiveStory();
}

function closeStoryViewer() {
  if (!storyViewerModal) return;

  storyViewerModal.hidden = true;

  if (storyTimer) {
    clearTimeout(storyTimer);
    storyTimer = null;
  }

  if (storyProgressBar) {
    storyProgressBar.classList.remove("playing");
    storyProgressBar.style.width = "0%";
  }
}

function renderActiveStory() {
  const story = storiesCache[activeStoryIndex];

  if (!story) {
    closeStoryViewer();
    return;
  }

  if (storyViewerAvatar) {
    storyViewerAvatar.src = story.userAvatar || fallbackAvatar;
  }

  if (storyViewerName) {
    storyViewerName.textContent = story.userName || story.userUsername || "Usuário";
  }

  if (storyViewerTime) {
    storyViewerTime.textContent = story.createdAt ? formatDate(story.createdAt) : "agora";
  }

  if (storyViewerText) {
    storyViewerText.textContent = story.text || story.content || "Story sem texto.";
  }

  if (story.music) {
    storyViewerMusic.hidden = false;

    if (storyViewerMusicTitle) {
      storyViewerMusicTitle.textContent = story.music.title || "Música";
    }

    if (storyViewerMusicArtist) {
      storyViewerMusicArtist.textContent = story.music.subtitle || story.music.artist || "Vinyl";
    }
  } else {
    storyViewerMusic.hidden = true;
  }

  restartStoryProgress();
}

function restartStoryProgress() {
  if (storyTimer) {
    clearTimeout(storyTimer);
    storyTimer = null;
  }

  if (!storyProgressBar) return;

  storyProgressBar.classList.remove("playing");
  storyProgressBar.style.width = "0%";

  void storyProgressBar.offsetWidth;

  storyProgressBar.classList.add("playing");

  storyTimer = setTimeout(() => {
    nextStory();
  }, 6000);
}

function nextStory() {
  if (!storiesCache.length) return;

  const nextIndex = activeStoryIndex + 1;

  if (nextIndex >= storiesCache.length) {
    closeStoryViewer();
    return;
  }

  activeStoryIndex = nextIndex;
  renderActiveStory();
}

function prevStory() {
  if (!storiesCache.length) return;

  const prevIndex = activeStoryIndex - 1;

  if (prevIndex < 1) {
    activeStoryIndex = 1;
  } else {
    activeStoryIndex = prevIndex;
  }

  renderActiveStory();
}

closeStoryViewerBtn?.addEventListener("click", closeStoryViewer);
closeStoryViewerBackdrop?.addEventListener("click", closeStoryViewer);
nextStoryBtn?.addEventListener("click", nextStory);
prevStoryBtn?.addEventListener("click", prevStory);

document.querySelectorAll("[data-story-reaction]").forEach((button) => {
  button.addEventListener("click", () => {
    const reaction = button.dataset.storyReaction;
    showToast(`Você reagiu com ${reaction}`);
  });
});

/* NOTIFICATIONS */

function openNotifications() {
  if (notificationsModal) {
    notificationsModal.hidden = false;
  }
}

function closeNotifications() {
  if (notificationsModal) {
    notificationsModal.hidden = true;
  }
}

openNotificationsBtn?.addEventListener("click", openNotifications);
openNotificationsBtnSide?.addEventListener("click", openNotifications);
closeNotificationsBackdrop?.addEventListener("click", closeNotifications);
closeNotificationsBtn?.addEventListener("click", closeNotifications);

document.querySelectorAll(".notifications-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".notifications-tabs button").forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");
    currentNotificationFilter = button.dataset.notificationFilter || "all";

    listenNotifications();
  });
});

function listenNotifications() {
  if (!currentUser) return;

  if (unsubscribeNotifications) {
    unsubscribeNotifications();
    unsubscribeNotifications = null;
  }

  let notificationsQuery;

  try {
    if (currentNotificationFilter === "unread") {
      notificationsQuery = query(
        collection(db, "notifications"),
        where("toUserId", "==", currentUser.uid),
        where("read", "==", false),
        orderBy("createdAt", "desc"),
        limit(20)
      );
    } else if (currentNotificationFilter === "follow_request") {
      notificationsQuery = query(
        collection(db, "notifications"),
        where("toUserId", "==", currentUser.uid),
        where("type", "==", "follow_request"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
    } else {
      notificationsQuery = query(
        collection(db, "notifications"),
        where("toUserId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(20)
      );
    }

    unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      renderNotifications(notifications);
      renderMiniNotifications(notifications.slice(0, 3));

      const unreadCount = notifications.filter((item) => !item.read).length;

      if (notificationBadge) {
        notificationBadge.hidden = unreadCount === 0;
        notificationBadge.textContent = unreadCount;
      }
    }, (error) => {
      console.error("Erro notificações:", error);

      if (notificationsList) {
        notificationsList.innerHTML = `
          <p class="empty-state">Erro ao carregar notificações.</p>
        `;
      }
    });
  } catch (error) {
    console.error(error);
  }
}

function renderNotifications(notifications) {
  if (!notificationsList) return;

  if (!notifications.length) {
    notificationsList.innerHTML = `
      <p class="empty-state">Nenhuma notificação ainda.</p>
    `;
    return;
  }

  notificationsList.innerHTML = notifications.map((item) => `
    <div class="notification-item">
      <strong>${safeText(item.title || "Nova notificação")}</strong>
      <p class="empty-state">${safeText(item.message || "Você recebeu uma nova interação.")}</p>
    </div>
  `).join("");
}

function renderMiniNotifications(notifications) {
  if (!miniNotificationsList) return;

  if (!notifications.length) {
    miniNotificationsList.innerHTML = `
      <p class="empty-state">Nenhuma notificação ainda.</p>
    `;
    return;
  }

  miniNotificationsList.innerHTML = notifications.map((item) => `
    <div class="notification-mini-item">
      <img src="${safeText(item.fromUserAvatar || fallbackAvatar)}" alt="Avatar">

      <div>
        <strong>${safeText(item.title || "Notificação")}</strong>
        <span>${safeText(item.message || "Nova interação")}</span>
      </div>
    </div>
  `).join("");
}

/* SUGGESTIONS */

async function loadSuggestions() {
  if (!suggestionsList || !currentUser) return;

  try {
    const usersQuery = query(
      collection(db, "users"),
      limit(8)
    );

    const snapshot = await getDocs(usersQuery);

    const users = snapshot.docs
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

    suggestionsList.innerHTML = users.map((user) => `
      <div class="suggestion-item">
        <img src="${safeText(user.photoURL || user.avatar || fallbackAvatar)}" alt="${safeText(user.displayName || user.username || "Usuário")}">

        <div>
          <strong>${safeText(user.displayName || user.name || "Usuário")}</strong>
          <span>@${safeText(user.username || "usuario")}</span>
        </div>

        <a href="public-profile.html?uid=${safeText(user.id)}">Ver</a>
      </div>
    `).join("");
  } catch (error) {
    console.error("Erro sugestões:", error);

    suggestionsList.innerHTML = `
      <p class="empty-state">Erro ao carregar sugestões.</p>
    `;
  }
}

/* STATS */

async function loadStats() {
  try {
    const postsSnapshot = await getDocs(query(collection(db, "posts"), limit(60)));
    const usersSnapshot = await getDocs(query(collection(db, "users"), limit(60)));

    if (heroPostsCount) heroPostsCount.textContent = postsSnapshot.size;
    if (heroUsersCount) heroUsersCount.textContent = usersSnapshot.size;
    if (heroSongsCount) heroSongsCount.textContent = "∞";
  } catch (error) {
    console.warn("Erro ao carregar estatísticas:", error);
  }
}

/* NOW PLAYING */

function loadNowPlaying() {
  if (!nowPlayingBox) return;

  const connected = currentUserData?.spotifyConnected || currentUserData?.spotify?.connected;

  if (!connected) {
    nowPlayingBox.innerHTML = `
      <p class="empty-state">Conecte seu Spotify para mostrar sua música atual.</p>
    `;
    return;
  }

  const track = currentUserData?.nowPlaying || {
    title: "Spotify conectado",
    artist: "Pronto para mostrar sua música atual",
    image: "https://placehold.co/300x300/19191f/ff4d6d?text=SPOTIFY"
  };

  nowPlayingBox.innerHTML = `
    <div class="now-playing-content">
      <img src="${safeText(track.image || fallbackCover)}" alt="${safeText(track.title)}">

      <div>
        <strong>${safeText(track.title || "Spotify conectado")}</strong>
        <span>${safeText(track.artist || "Vinyl")}</span>
      </div>
    </div>
  `;
}

/* POPULAR REVIEWS */

function loadPopularReviews() {
  if (!popularReviewsBox) return;

  popularReviewsBox.innerHTML = `
    <div class="review-mini-item">
      <div>
        <strong>Compartilhe seu primeiro review</strong>
        <span>Os melhores posts aparecem aqui.</span>
      </div>
    </div>
  `;
}

/* CHAT / MENSAGENS */

function openChatWidget() {
  if (!chatWidget) return;

  chatWidget.hidden = false;

  setTimeout(() => {
    chatSearchInput?.focus();
  }, 120);
}

function closeChatWidget() {
  if (!chatWidget) return;

  chatWidget.hidden = true;
}

openMessagesBtn?.addEventListener("click", openChatWidget);
closeChatWidgetBtn?.addEventListener("click", closeChatWidget);
closeChatWidgetBackdrop?.addEventListener("click", closeChatWidget);

chatSearchInput?.addEventListener("input", () => {
  loadChatWidget(chatSearchInput.value.trim());
});

async function loadChatWidget(searchTerm = "") {
  if (!chatWidgetList || !currentUser) return;

  try {
    const usersQuery = query(collection(db, "users"), limit(8));
    const snapshot = await getDocs(usersQuery);

    let users = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .filter((user) => user.id !== currentUser.uid);

    if (searchTerm) {
      const normalized = searchTerm.toLowerCase();

      users = users.filter((user) => {
        const name = String(user.displayName || user.name || "").toLowerCase();
        const username = String(user.username || "").toLowerCase();

        return name.includes(normalized) || username.includes(normalized);
      });
    }

    if (!users.length) {
      chatWidgetList.innerHTML = `
        <p class="empty-state">Nenhuma conversa encontrada.</p>
      `;
      return;
    }

    chatWidgetList.innerHTML = users.slice(0, 5).map((user) => `
      <a class="chat-item" href="messages.html?uid=${safeText(user.id)}">
        <img src="${safeText(user.photoURL || user.avatar || fallbackAvatar)}" alt="${safeText(user.displayName || "Usuário")}">

        <div>
          <strong>${safeText(user.displayName || user.name || "Usuário")}</strong>
          <span>@${safeText(user.username || "usuario")}</span>
        </div>
      </a>
    `).join("");
  } catch (error) {
    console.error("Erro chat:", error);

    chatWidgetList.innerHTML = `
      <p class="empty-state">Erro ao carregar mensagens.</p>
    `;
  }
}

/* GLOBAL KEYBOARD */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (chatWidget && !chatWidget.hidden) {
      closeChatWidget();
    }

    if (storyViewerModal && !storyViewerModal.hidden) {
      closeStoryViewer();
    }

    if (notificationsModal && !notificationsModal.hidden) {
      closeNotifications();
    }

    if (musicPickerModal && !musicPickerModal.hidden) {
      closeMusicPicker();
    }

    if (storyModal && !storyModal.hidden) {
      closeStoryModal();
    }
  }

  if (storyViewerModal && !storyViewerModal.hidden) {
    if (event.key === "ArrowRight") {
      nextStory();
    }

    if (event.key === "ArrowLeft") {
      prevStory();
    }
  }
});

/* IMAGE BUTTON */

document.getElementById("addImageBtn")?.addEventListener("click", () => {
  showToast("Upload de imagem será conectado depois.");
});