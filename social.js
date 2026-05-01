import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CLOUDINARY_CLOUD_NAME = "duqohlp69";
const CLOUDINARY_UPLOAD_PRESET = "testewwww";
const MAX_POST_LENGTH = 280;
const MAX_MEDIA_SIZE = 25 * 1024 * 1024;
const STORY_DURATION_MS = 24 * 60 * 60 * 1000;

const postText = document.getElementById("postText");
const spotifyUrlInput = document.getElementById("spotifyUrlInput");
const spotifyPreview = document.getElementById("spotifyPreview");
const composerMoreBtn = document.getElementById("composerMoreBtn");
const composerMoreMenu = document.getElementById("composerMoreMenu");
const composerMorePanel = document.getElementById("composerMorePanel");
const spotifyOptionBtn = document.getElementById("spotifyOptionBtn");
const mediaInput = document.getElementById("mediaInput");
const mediaPreview = document.getElementById("mediaPreview");
const composerHint = document.getElementById("composerHint");
const charCounter = document.getElementById("charCounter");
const postBtn = document.getElementById("postBtn");

const storyCaption = document.getElementById("storyCaption");
const storyInput = document.getElementById("storyInput");
const storyPostBtn = document.getElementById("storyPostBtn");
const storySelectedPreview = document.getElementById("storySelectedPreview");
const storiesList = document.getElementById("storiesList");
const storyViewer = document.getElementById("storyViewer");
const closeStoryViewer = document.getElementById("closeStoryViewer");
const storyViewerMedia = document.getElementById("storyViewerMedia");
const storyViewerAvatar = document.getElementById("storyViewerAvatar");
const storyViewerName = document.getElementById("storyViewerName");
const storyViewerCaption = document.getElementById("storyViewerCaption");
const deleteStoryBtn = document.getElementById("deleteStoryBtn");

const feedList = document.getElementById("feedList");

const userSearchInput = document.getElementById("userSearchInput");
const userSearchBtn = document.getElementById("userSearchBtn");
const userResults = document.getElementById("userResults");
const mobileUserSearchInput = document.getElementById("mobileUserSearchInput");
const mobileUserSearchBtn = document.getElementById("mobileUserSearchBtn");
const mobileUserResults = document.getElementById("mobileUserResults");
const trendingList = document.getElementById("trendingList");
const suggestedUsers = document.getElementById("suggestedUsers");
const popularPosts = document.getElementById("popularPosts");
const mobileTrendingList = document.getElementById("mobileTrendingList");
const mobileSuggestedUsers = document.getElementById("mobileSuggestedUsers");
const mobilePopularPosts = document.getElementById("mobilePopularPosts");
const railProfileAvatar = document.getElementById("railProfileAvatar");
const railProfileName = document.getElementById("railProfileName");
const railProfileHandle = document.getElementById("railProfileHandle");

const tabs = document.querySelectorAll(".tab");
const feedTypeButtons = document.querySelectorAll(".feed-type");

let currentUser = null;
let currentUserData = null;
let currentFeedScope = "all";
let feedMode = "smart";
let selectedFile = null;
let selectedStoryFile = null;
let activeStory = null;
let followingIds = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await loadCurrentUserData();
  await loadFollowing();
  renderRailProfile();
  updateComposerState();
  updateStoryComposerState();
  await loadStories();
  await loadDiscoveryPanels();
  await loadFeed();
});

async function loadCurrentUserData() {
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));

  currentUserData = userSnap.exists()
    ? userSnap.data()
    : {};
}

function renderRailProfile() {
  const displayName =
    currentUserData?.username ||
    currentUserData?.displayName ||
    currentUser.displayName ||
    "Usuário Vinyl";

  const avatar =
    currentUserData?.photoURL ||
    currentUser.photoURL ||
    getFallbackAvatar(displayName);

  if (railProfileAvatar) {
    railProfileAvatar.src = avatar;
    railProfileAvatar.alt = displayName;
  }

  if (railProfileName) {
    railProfileName.textContent = displayName;
  }

  if (railProfileHandle) {
    railProfileHandle.textContent = `@${String(displayName).replace(/\s+/g, "").toLowerCase()}`;
  }
}

async function loadFollowing() {
  try {
    const followingSnap = await getDocs(
      collection(db, "users", currentUser.uid, "following")
    );

    followingIds = followingSnap.docs.map((docItem) => docItem.id);
  } catch (error) {
    console.error("Erro ao carregar seguindo:", error);
    followingIds = [];
  }
}

postText?.addEventListener("input", updateComposerState);
spotifyUrlInput?.addEventListener("input", updateComposerState);

composerMoreBtn?.addEventListener("click", () => {
  const isOpen = composerMoreMenu.classList.toggle("show");
  composerMoreBtn.setAttribute("aria-expanded", String(isOpen));
});

spotifyOptionBtn?.addEventListener("click", () => {
  composerMorePanel.classList.add("show");
  composerMoreMenu.classList.remove("show");
  composerMoreBtn.setAttribute("aria-expanded", "false");
  spotifyUrlInput.focus();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".composer-more")) {
    composerMoreMenu?.classList.remove("show");
    composerMoreBtn?.setAttribute("aria-expanded", "false");
  }
});
storyCaption?.addEventListener("input", updateStoryComposerState);

storyInput?.addEventListener("change", () => {
  selectedStoryFile = storyInput.files[0] || null;
  storySelectedPreview.innerHTML = "";

  if (!selectedStoryFile) {
    updateStoryComposerState();
    return;
  }

  if (selectedStoryFile.size > MAX_MEDIA_SIZE) {
    alert("A mídia do story precisa ter até 25 MB.");
    selectedStoryFile = null;
    storyInput.value = "";
    updateStoryComposerState();
    return;
  }

  const previewUrl = URL.createObjectURL(selectedStoryFile);
  const isImage = selectedStoryFile.type.startsWith("image/");
  const isVideo = selectedStoryFile.type.startsWith("video/");

  storySelectedPreview.innerHTML = `
    <div class="story-selected-card">
      ${isImage ? `<img src="${escapeAttribute(previewUrl)}" alt="Preview do story">` : ""}
      ${isVideo ? `<video src="${escapeAttribute(previewUrl)}"></video>` : ""}

      <div>
        <strong>Story selecionado</strong>
        <p>${escapeHtml(selectedStoryFile.name)}</p>
      </div>

      <button type="button" id="removeStoryPreview" class="remove-story-preview" aria-label="Remover story">×</button>
    </div>
  `;

  document.getElementById("removeStoryPreview")?.addEventListener("click", () => {
    selectedStoryFile = null;
    storyInput.value = "";
    storySelectedPreview.innerHTML = "";
    updateStoryComposerState();
  });

  updateStoryComposerState();
});

storyPostBtn?.addEventListener("click", async () => {
  if (!selectedStoryFile) return;

  try {
    storyPostBtn.disabled = true;
    storyPostBtn.textContent = "Publicando...";

    const mediaUrl = await uploadToCloudinary(selectedStoryFile, "vinyl/stories");
    const mediaType = selectedStoryFile.type.startsWith("video/") ? "video" : "image";

    await addDoc(collection(db, "stories"), {
      userId: currentUser.uid,
      userName:
        currentUserData?.username ||
        currentUserData?.displayName ||
        currentUser.displayName ||
        "Usuário Vinyl",
      userPhoto:
        currentUserData?.photoURL ||
        currentUser.photoURL ||
        "",
      caption: storyCaption.value.trim(),
      mediaUrl,
      mediaType,
      createdAt: serverTimestamp()
    });

    clearStoryComposer();
    await loadStories();
  } catch (error) {
    console.error("Erro ao publicar story:", error);
    alert("Não foi possível publicar o story.");
  } finally {
    storyPostBtn.textContent = "Publicar story";
    updateStoryComposerState();
  }
});

closeStoryViewer?.addEventListener("click", closeStoryModal);

storyViewer?.addEventListener("click", (event) => {
  if (event.target === storyViewer) {
    closeStoryModal();
  }
});

deleteStoryBtn?.addEventListener("click", async () => {
  if (!activeStory || activeStory.userId !== currentUser.uid) return;

  const confirmDelete = confirm("Deseja excluir este story?");
  if (!confirmDelete) return;

  try {
    deleteStoryBtn.disabled = true;
    await deleteDoc(doc(db, "stories", activeStory.id));
    closeStoryModal();
    await loadStories();
  } catch (error) {
    console.error("Erro ao excluir story:", error);
    alert("Não foi possível excluir o story.");
  } finally {
    deleteStoryBtn.disabled = false;
  }
});

mediaInput?.addEventListener("change", () => {
  composerMoreMenu?.classList.remove("show");
  composerMoreBtn?.setAttribute("aria-expanded", "false");

  selectedFile = mediaInput.files[0] || null;
  mediaPreview.innerHTML = "";

  if (!selectedFile) {
    updateComposerState();
    return;
  }

  if (selectedFile.size > MAX_MEDIA_SIZE) {
    alert("A mídia precisa ter até 25 MB.");
    selectedFile = null;
    mediaInput.value = "";
    updateComposerState();
    return;
  }

  const previewUrl = URL.createObjectURL(selectedFile);
  const isImage = selectedFile.type.startsWith("image/");
  const isVideo = selectedFile.type.startsWith("video/");

  mediaPreview.innerHTML = `
    <div class="post-preview-card">
      <button type="button" id="removePreviewBtn" class="remove-preview-btn">×</button>

      ${isImage ? `<img src="${escapeAttribute(previewUrl)}" alt="Preview do post">` : ""}
      ${isVideo ? `<video src="${escapeAttribute(previewUrl)}" controls></video>` : ""}

      <div class="post-preview-info">
        <strong>Prévia do post</strong>
        <p>${escapeHtml(selectedFile.name)}</p>
      </div>
    </div>
  `;

  document.getElementById("removePreviewBtn")?.addEventListener("click", () => {
    selectedFile = null;
    mediaInput.value = "";
    mediaPreview.innerHTML = "";
    updateComposerState();
  });

  updateComposerState();
});

postBtn?.addEventListener("click", async () => {
  const text = postText.value.trim();
  const spotifyUrl = spotifyUrlInput.value.trim();

  if (!text && !selectedFile && !spotifyUrl) {
    alert("Escreva algo, envie uma mídia ou cole um link.");
    return;
  }

  if (spotifyUrl && !isValidSpotifyUrl(spotifyUrl)) {
    alert("Cole um link válido do Spotify.");
    spotifyUrlInput.focus();
    return;
  }

  try {
    postBtn.disabled = true;
    postBtn.textContent = "Publicando...";

    let imageUrl = "";
    let videoUrl = "";

    if (selectedFile) {
      const uploadedUrl = await uploadToCloudinary(selectedFile);

      if (selectedFile.type.startsWith("image/")) imageUrl = uploadedUrl;
      if (selectedFile.type.startsWith("video/")) videoUrl = uploadedUrl;
    }

    const extractedGenres = extractGenres(text, currentUserData);
    const extractedArtists = extractArtists(text, currentUserData);

    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      userName:
        currentUserData?.username ||
        currentUserData?.displayName ||
        currentUser.displayName ||
        "Usuário Vinyl",
      userPhoto:
        currentUserData?.photoURL ||
        currentUser.photoURL ||
        "",

      text,
      imageUrl,
      videoUrl,
      spotifyUrl,

      genres: extractedGenres,
      artists: extractedArtists,

      likes: [],
      reposts: [],
      likesCount: 0,
      repostCount: 0,
      replyCount: 0,

      isRepost: false,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    clearComposer();
    await loadFeed();
  } catch (error) {
    console.error(error);
    alert("Erro ao publicar.");
  } finally {
    postBtn.textContent = "Publicar";
    updateComposerState();
  }
});

feedTypeButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    feedTypeButtons.forEach((item) => item.classList.remove("active"));
    btn.classList.add("active");

    feedMode = btn.dataset.feed;
    await loadFeed();
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    currentFeedScope = tab.dataset.feedScope;
    await loadFeed();
  });
});

async function loadStories() {
  if (!storiesList) return;

  storiesList.innerHTML = `<p class="message">Carregando stories...</p>`;

  try {
    const storiesQuery = query(
      collection(db, "stories"),
      orderBy("createdAt", "desc"),
      limit(60)
    );

    const snapshot = await getDocs(storiesQuery);
    const now = Date.now();

    const stories = snapshot.docs
      .map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }))
      .filter((story) => {
        const createdAt = story.createdAt?.toMillis?.();
        return createdAt && now - createdAt <= STORY_DURATION_MS;
      });

    renderStories(stories);
  } catch (error) {
    console.error("Erro ao carregar stories:", error);
    storiesList.innerHTML = `<p class="message">Erro ao carregar stories.</p>`;
  }
}

function renderStories(stories) {
  storiesList.innerHTML = "";

  if (!stories.length) {
    storiesList.innerHTML = `<p class="message">Nenhum story ativo agora.</p>`;
    return;
  }

  stories.forEach((story) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "story-card";

    const avatar = story.userPhoto || getFallbackAvatar(story.userName || "User");

    button.innerHTML = `
      <div class="story-ring">
        <img src="${escapeAttribute(avatar)}" alt="${escapeAttribute(story.userName || "Usuário")}">
      </div>
      <span>${escapeHtml(story.userName || "Usuário Vinyl")}</span>
      <small>${formatStoryAge(story.createdAt)}</small>
    `;

    button.addEventListener("click", () => {
      openStoryModal(story);
    });

    storiesList.appendChild(button);
  });
}

function openStoryModal(story) {
  activeStory = story;

  storyViewerMedia.innerHTML = story.mediaType === "video"
    ? `
      <video controls autoplay>
        <source src="${escapeAttribute(story.mediaUrl)}">
      </video>
    `
    : `<img src="${escapeAttribute(story.mediaUrl)}" alt="${escapeAttribute(story.caption || "Story")}">`;

  const avatar = story.userPhoto || getFallbackAvatar(story.userName || "User");

  storyViewerAvatar.src = avatar;
  storyViewerAvatar.alt = story.userName || "Usuário";
  storyViewerName.textContent = story.userName || "Usuário Vinyl";
  storyViewerCaption.textContent = story.caption || "Sem legenda.";

  deleteStoryBtn.classList.toggle("show", story.userId === currentUser.uid);
  storyViewer.classList.add("show");
  storyViewer.setAttribute("aria-hidden", "false");
}

function closeStoryModal() {
  activeStory = null;
  storyViewer.classList.remove("show");
  storyViewer.setAttribute("aria-hidden", "true");
  storyViewerMedia.innerHTML = "";
  deleteStoryBtn.classList.remove("show");
}

async function loadDiscoveryPanels() {
  await Promise.all([
    loadTrendingTopics(),
    loadSuggestedUsers(),
    loadPopularPosts()
  ]);

  mirrorDiscoveryToMobile();
}

async function loadTrendingTopics() {
  if (!trendingList) return;

  try {
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(80)
    );

    const snapshot = await getDocs(postsQuery);
    const counts = new Map();

    snapshot.docs.forEach((docItem) => {
      const post = docItem.data();

      [...(post.genres || []), ...(post.artists || [])]
        .map((item) => String(item).trim())
        .filter(Boolean)
        .forEach((item) => {
          const key = item.toLowerCase();
          const current = counts.get(key) || { label: item, count: 0 };
          current.count += 1;
          counts.set(key, current);
        });
    });

    const trends = [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (!trends.length) {
      trendingList.innerHTML = `<p class="side-message">Publique com artistas ou gêneros para criar tendências.</p>`;
      return;
    }

    trendingList.innerHTML = trends.map((trend, index) => `
      <a href="search.html?q=${encodeURIComponent(trend.label)}" class="trend-item">
        <div>
          <span>${index + 1}. Em alta no Vinyl</span>
          <strong>${escapeHtml(trend.label)}</strong>
          <span>${trend.count} posts</span>
        </div>
      </a>
    `).join("");
  } catch (error) {
    console.error("Erro ao carregar tendências:", error);
    trendingList.innerHTML = `<p class="side-message">Não foi possível carregar tendências.</p>`;
  }
}

async function loadSuggestedUsers() {
  if (!suggestedUsers) return;

  try {
    const snapshot = await getDocs(collection(db, "users"));
    const userGenres = normalizeArray(currentUserData?.favoriteGenres || []);

    const users = snapshot.docs
      .map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }))
      .filter((user) => user.id !== currentUser.uid)
      .filter((user) => !followingIds.includes(user.id))
      .map((user) => {
        const genres = normalizeArray(user.favoriteGenres || []);
        const matches = genres.filter((genre) => userGenres.includes(genre)).length;

        return {
          ...user,
          score: matches + getVisibleArtists(
            user.favoriteArtists || [],
            user.hiddenArtists || []
          ).length * 0.1
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    if (!users.length) {
      suggestedUsers.innerHTML = `<p class="side-message">Nenhum novo perfil encontrado agora.</p>`;
      return;
    }

    suggestedUsers.innerHTML = "";

    users.forEach((user) => {
      const avatar = user.photoURL || getFallbackAvatar(user.displayName || user.username || "User");
      const genreSummary = Array.isArray(user.favoriteGenres) && user.favoriteGenres.length
        ? user.favoriteGenres.slice(0, 2).join(", ")
        : "Perfil musical";
      const card = document.createElement("article");
      card.className = "suggested-user";

      card.innerHTML = `
        <img src="${escapeAttribute(avatar)}" alt="${escapeAttribute(user.displayName || user.username || "Usuário")}">
        <div>
          <strong>${escapeHtml(user.displayName || user.username || "Usuário")}</strong>
          <span>${escapeHtml(genreSummary)}</span>
        </div>
        <button type="button" class="side-follow-btn">Seguir</button>
      `;

      card.addEventListener("click", () => {
        window.location.href = `/public-profile?user=${encodeURIComponent(user.id)}`;
      });

      card.querySelector(".side-follow-btn")?.addEventListener("click", async (event) => {
        event.stopPropagation();
        event.currentTarget.disabled = true;
        await toggleFollow(user.id);
        await loadDiscoveryPanels();

        if (currentFeedScope === "following") {
          await loadFeed();
        }
      });

      suggestedUsers.appendChild(card);
    });
  } catch (error) {
    console.error("Erro ao carregar sugestões:", error);
    suggestedUsers.innerHTML = `<p class="side-message">Não foi possível carregar sugestões.</p>`;
  }
}

async function loadPopularPosts() {
  if (!popularPosts) return;

  try {
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(80)
    );

    const snapshot = await getDocs(postsQuery);
    const posts = snapshot.docs
      .map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }))
      .sort((a, b) => getPostScore(b) - getPostScore(a))
      .slice(0, 4);

    if (!posts.length) {
      popularPosts.innerHTML = `<p class="side-message">Nenhum post em alta ainda.</p>`;
      return;
    }

    popularPosts.innerHTML = posts.map((post) => `
      <article class="popular-post">
        <div>
          <span>${escapeHtml(post.userName || "Usuário Vinyl")}</span>
          <strong>${escapeHtml(post.text || post.spotifyUrl || "Post com mídia")}</strong>
          <span>${getPostScore(post)} interações</span>
        </div>
      </article>
    `).join("");
  } catch (error) {
    console.error("Erro ao carregar posts em alta:", error);
    popularPosts.innerHTML = `<p class="side-message">Não foi possível carregar posts.</p>`;
  }
}

function mirrorDiscoveryToMobile() {
  if (mobileTrendingList && trendingList) {
    mobileTrendingList.innerHTML = trendingList.innerHTML;
  }

  if (mobileSuggestedUsers && suggestedUsers) {
    mobileSuggestedUsers.innerHTML = suggestedUsers.innerHTML;

    mobileSuggestedUsers.querySelectorAll(".suggested-user").forEach((card, index) => {
      const desktopCard = suggestedUsers.querySelectorAll(".suggested-user")[index];
      const desktopButton = desktopCard?.querySelector(".side-follow-btn");

      card.addEventListener("click", () => {
        desktopCard?.click();
      });

      card.querySelector(".side-follow-btn")?.addEventListener("click", (event) => {
        event.stopPropagation();
        desktopButton?.click();
      });
    });
  }

  if (mobilePopularPosts && popularPosts) {
    mobilePopularPosts.innerHTML = popularPosts.innerHTML;
  }
}

async function loadFeed() {
  if (!feedList) return;

  feedList.innerHTML = `<p class="message">Carregando feed...</p>`;

  try {
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(120)
    );

    const snapshot = await getDocs(postsQuery);

    let posts = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }));

    if (currentFeedScope === "following") {
      posts = posts.filter((post) => followingIds.includes(post.userId));
    }

    if (feedMode === "smart") {
      posts = buildSmartFeed(posts);
    }

    if (feedMode === "recent") {
      posts = posts.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;

        return dateB - dateA;
      });
    }

    renderFeed(posts);
  } catch (error) {
    console.error(error);

    feedList.innerHTML = `
      <p class="message">Erro ao carregar feed.</p>
    `;
  }
}

function buildSmartFeed(posts) {
  const userGenres = normalizeArray(currentUserData?.favoriteGenres || []);
  const userArtists = normalizeArtists(getVisibleArtists(
    currentUserData?.favoriteArtists || [],
    currentUserData?.hiddenArtists || []
  ));

  const scoredPosts = posts.map((post) => {
    let score = 0;

    if (followingIds.includes(post.userId)) score += 60;

    const postGenres = normalizeArray(post.genres || []);
    const postArtists = normalizeArray(post.artists || []);

    if (postGenres.some((genre) => userGenres.includes(genre))) score += 40;
    if (postArtists.some((artist) => userArtists.includes(artist))) score += 55;

    score += (post.likes?.length || post.likesCount || 0) * 2;
    score += (post.reposts?.length || post.repostCount || 0) * 4;
    score += (post.replyCount || 0) * 3;

    if (post.createdAt?.toMillis) {
      const ageHours =
        (Date.now() - post.createdAt.toMillis()) / (1000 * 60 * 60);

      score += Math.max(0, 48 - ageHours);
    }

    if (post.userId === currentUser.uid) score += 8;

    return {
      ...post,
      score: Math.round(score)
    };
  });

  return scoredPosts.sort((a, b) => b.score - a.score);
}

function renderFeed(posts) {
  feedList.innerHTML = "";

  if (!posts.length) {
    feedList.innerHTML =
      currentFeedScope === "following"
        ? `<p class="message">Você ainda não segue ninguém com posts recentes. Busque usuários acima para montar seu feed.</p>`
        : `<p class="message">Nenhum post encontrado.</p>`;
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "feed-card";

    const avatar = post.userPhoto || getFallbackAvatar(post.userName || "User");
    const isOwner = currentUser?.uid === post.userId;
    const alreadyLiked = post.likes?.includes(currentUser.uid);
    const alreadyReposted = post.reposts?.includes(currentUser.uid);
    const showRecommendationLabel = feedMode === "smart" && !isOwner;

    card.innerHTML = `
      ${
        post.isRepost
          ? `
            <div class="repost-label">
              Repost de ${escapeHtml(post.userName || "Usuário Vinyl")} a partir de ${escapeHtml(post.repostUserName || "usuário")}
            </div>
          `
          : ""
      }

      ${showRecommendationLabel ? `<span class="feed-score">Recomendado para você</span>` : ""}

      <div class="feed-user">
        <img src="${escapeAttribute(avatar)}" class="feed-avatar" alt="${escapeAttribute(post.userName || "Usuário")}">

        <div>
          <a href="/public-profile?user=${escapeAttribute(post.userId)}">
            ${escapeHtml(post.userName || "Usuário Vinyl")}
          </a>
          <p class="feed-date">${formatDate(post.createdAt)}</p>
        </div>
      </div>

      ${post.text ? `<p class="feed-text">${renderPostText(post.text)}</p>` : ""}

      ${renderMedia(post)}
      ${renderSpotifyLink(post.spotifyUrl)}

      <div class="social-actions">
        <button type="button" class="like-btn ${alreadyLiked ? "active" : ""}">
          ♥ ${post.likes?.length || 0}
        </button>

        <button type="button" class="repost-btn ${alreadyReposted ? "active" : ""}">
          Repost ${post.reposts?.length || 0}
        </button>

        <button type="button" class="reply-toggle-btn">
          Responder ${post.replyCount || 0}
        </button>
      </div>

      <div class="reply-box">
        <div class="reply-input">
          <input type="text" class="replyTextInput" placeholder="Escreva uma resposta...">
          <button type="button" class="sendReplyBtn">Enviar</button>
        </div>

        <div class="replies-list">
          <p class="message">Carregando respostas...</p>
        </div>
      </div>

      ${
        isOwner
          ? `
            <div class="post-actions">
              <button type="button" class="edit-post-btn">Editar</button>
              <button type="button" class="delete-post-btn">Deletar</button>
            </div>
          `
          : ""
      }

      <div class="edit-box" style="display:none;">
        <textarea>${escapeHtml(post.text || "")}</textarea>

        <div class="edit-actions">
          <button type="button" class="save-edit">Salvar</button>
          <button type="button" class="cancel-edit">Cancelar</button>
        </div>
      </div>
    `;

    attachPostEvents(card, post);
    feedList.appendChild(card);
  });
}

function attachPostEvents(card, post) {
  const likeBtn = card.querySelector(".like-btn");
  const repostBtn = card.querySelector(".repost-btn");

  const replyToggleBtn = card.querySelector(".reply-toggle-btn");
  const replyBox = card.querySelector(".reply-box");
  const replyInput = card.querySelector(".replyTextInput");
  const sendReplyBtn = card.querySelector(".sendReplyBtn");
  const repliesList = card.querySelector(".replies-list");

  const deleteBtn = card.querySelector(".delete-post-btn");
  const editBtn = card.querySelector(".edit-post-btn");

  const editBox = card.querySelector(".edit-box");
  const saveBtn = card.querySelector(".save-edit");
  const cancelBtn = card.querySelector(".cancel-edit");

  likeBtn?.addEventListener("click", async () => {
    try {
      likeBtn.disabled = true;

      const postRef = doc(db, "posts", post.id);
      const alreadyLiked = post.likes?.includes(currentUser.uid);

      await updateDoc(postRef, {
        likes: alreadyLiked
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
        likesCount: alreadyLiked
          ? Math.max((post.likes?.length || 1) - 1, 0)
          : (post.likes?.length || 0) + 1
      });

      await loadFeed();
    } catch (error) {
      console.error("Erro ao curtir:", error);
      alert("Não foi possível curtir este post. Verifique as regras do Firestore.");
      likeBtn.disabled = false;
    }
  });

  repostBtn?.addEventListener("click", async () => {
    try {
      repostBtn.disabled = true;

      const postRef = doc(db, "posts", post.id);
      const alreadyReposted = post.reposts?.includes(currentUser.uid);

      if (alreadyReposted) {
        await updateDoc(postRef, {
          reposts: arrayRemove(currentUser.uid),
          repostCount: Math.max((post.reposts?.length || 1) - 1, 0)
        });

        await loadFeed();
        return;
      }

      await updateDoc(postRef, {
        reposts: arrayUnion(currentUser.uid),
        repostCount: (post.reposts?.length || 0) + 1
      });

      await addDoc(collection(db, "posts"), {
        userId: currentUser.uid,
        userName:
          currentUserData?.username ||
          currentUserData?.displayName ||
          currentUser.displayName ||
          "Usuário Vinyl",
        userPhoto:
          currentUserData?.photoURL ||
          currentUser.photoURL ||
          "",

        text: post.text || "",
        imageUrl: post.imageUrl || "",
        videoUrl: post.videoUrl || "",
        spotifyUrl: post.spotifyUrl || "",

        genres: post.genres || [],
        artists: post.artists || [],

        repostOf: post.id,
        repostUserId: post.userId,
        repostUserName: post.userName || "Usuário Vinyl",

        likes: [],
        reposts: [],
        likesCount: 0,
        repostCount: 0,
        replyCount: 0,
        isRepost: true,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await loadFeed();
    } catch (error) {
      console.error("Erro ao republicar:", error);
      alert("Não foi possível republicar.");
      repostBtn.disabled = false;
    }
  });

  replyToggleBtn?.addEventListener("click", async () => {
    try {
      replyBox.classList.toggle("show");

      if (replyBox.classList.contains("show")) {
        await loadReplies(post.id, repliesList);
      }
    } catch (error) {
      console.error("Erro ao carregar respostas:", error);
      repliesList.innerHTML = `<p class="message">Não foi possível carregar as respostas.</p>`;
    }
  });

  sendReplyBtn?.addEventListener("click", async () => {
    const text = replyInput.value.trim();

    if (!text) return;

    try {
      sendReplyBtn.disabled = true;

      await addDoc(collection(db, "posts", post.id, "replies"), {
        userId: currentUser.uid,
        userName:
          currentUserData?.username ||
          currentUserData?.displayName ||
          currentUser.displayName ||
          "Usuário Vinyl",
        userPhoto:
          currentUserData?.photoURL ||
          currentUser.photoURL ||
          "",
        text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "posts", post.id), {
        replyCount: (post.replyCount || 0) + 1
      });

      replyInput.value = "";
      await loadReplies(post.id, repliesList);
    } catch (error) {
      console.error("Erro ao responder:", error);
      alert("Não foi possível responder este post. Verifique as regras do Firestore.");
    } finally {
      sendReplyBtn.disabled = false;
    }
  });

  deleteBtn?.addEventListener("click", async () => {
    const confirmDelete = confirm("Deseja deletar este post?");

    if (!confirmDelete) return;

    deleteBtn.disabled = true;
    await deleteDoc(doc(db, "posts", post.id));
    await loadFeed();
  });

  editBtn?.addEventListener("click", () => {
    editBox.style.display = "block";
  });

  cancelBtn?.addEventListener("click", () => {
    editBox.style.display = "none";
  });

  saveBtn?.addEventListener("click", async () => {
    const textarea = editBox.querySelector("textarea");
    const newText = textarea.value.trim();

    saveBtn.disabled = true;

    await updateDoc(doc(db, "posts", post.id), {
      text: newText,
      genres: extractGenres(newText, currentUserData),
      artists: extractArtists(newText, currentUserData),
      updatedAt: serverTimestamp()
    });

    await loadFeed();
  });
}

async function loadReplies(postId, container) {
  const repliesQuery = query(
    collection(db, "posts", postId, "replies"),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(repliesQuery);

  container.innerHTML = "";

  if (snapshot.empty) {
    container.innerHTML = `
      <p class="message">Nenhuma resposta ainda.</p>
    `;
    return;
  }

  snapshot.forEach((docItem) => {
    const reply = docItem.data();
    const avatar = reply.userPhoto || getFallbackAvatar(reply.userName || "User");

    const replyCard = document.createElement("div");
    replyCard.className = "reply-card";

    replyCard.innerHTML = `
      <img src="${escapeAttribute(avatar)}" alt="${escapeAttribute(reply.userName || "Usuário")}">

      <div>
        <strong>${escapeHtml(reply.userName || "Usuário Vinyl")}</strong>
        <p>${escapeHtml(reply.text)}</p>
      </div>
    `;

    container.appendChild(replyCard);
  });
}

function renderMedia(post) {
  if (post.imageUrl) {
    return `
      <div class="feed-media">
        <img src="${escapeAttribute(post.imageUrl)}" alt="Imagem do post">
      </div>
    `;
  }

  if (post.videoUrl) {
    return `
      <div class="feed-media">
        <video controls>
          <source src="${escapeAttribute(post.videoUrl)}">
        </video>
      </div>
    `;
  }

  return "";
}

function renderSpotifyLink(url) {
  if (!url || !isValidSpotifyUrl(url)) return "";

  return `
    <a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" class="spotify-post-link">
      Abrir link do Spotify
    </a>
  `;
}

userSearchBtn?.addEventListener("click", searchUsers);
mobileUserSearchBtn?.addEventListener("click", () => {
  if (userSearchInput && mobileUserSearchInput) {
    userSearchInput.value = mobileUserSearchInput.value;
  }

  searchUsers();
});

userSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchUsers();
  }
});

mobileUserSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();

    if (userSearchInput) {
      userSearchInput.value = mobileUserSearchInput.value;
    }

    searchUsers();
  }
});

async function searchUsers() {
  const text = userSearchInput.value.trim().toLowerCase();

  if (!text) {
    userResults.innerHTML = "";
    if (mobileUserResults) mobileUserResults.innerHTML = "";
    return;
  }

  userSearchBtn.disabled = true;
  if (mobileUserSearchBtn) mobileUserSearchBtn.disabled = true;
  userResults.innerHTML = `<p class="message">Buscando usuários...</p>`;
  if (mobileUserResults) {
    mobileUserResults.innerHTML = `<p class="message">Buscando usuários...</p>`;
  }

  try {
    const snapshot = await getDocs(collection(db, "users"));

    const users = snapshot.docs
      .map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }))
      .filter((user) => user.id !== currentUser.uid)
      .filter((user) =>
        `${user.displayName || ""} ${user.username || ""} ${user.email || ""}`
          .toLowerCase()
          .includes(text)
      );

    renderUsers(users);
    mirrorUserResultsToMobile();
  } catch (error) {
    console.error(error);
    userResults.innerHTML = `<p class="message">Erro ao buscar usuários.</p>`;
    if (mobileUserResults) {
      mobileUserResults.innerHTML = `<p class="message">Erro ao buscar usuários.</p>`;
    }
  } finally {
    userSearchBtn.disabled = false;
    if (mobileUserSearchBtn) mobileUserSearchBtn.disabled = false;
  }
}

function renderUsers(users) {
  userResults.innerHTML = "";

  if (!users.length) {
    userResults.innerHTML = `<p class="message">Nenhum usuário encontrado.</p>`;
    return;
  }

  users.forEach((user) => {
    const card = document.createElement("article");
    card.className = "user-card";

    const avatar =
      user.photoURL ||
      getFallbackAvatar(user.displayName || user.username || "User");

    const isFollowing = followingIds.includes(user.id);

    card.innerHTML = `
      <img src="${escapeAttribute(avatar)}" alt="${escapeAttribute(user.displayName || user.username || "Usuário")}">

      <div>
        <h3>${escapeHtml(user.displayName || user.username || "Usuário")}</h3>
        <p>${escapeHtml(user.bio || "Sem bio ainda.")}</p>
      </div>

      <button type="button" class="follow-user-btn ${isFollowing ? "following" : ""}" data-user-id="${escapeAttribute(user.id)}">
        ${isFollowing ? "Seguindo" : "Seguir"}
      </button>
    `;

    card.addEventListener("click", () => {
      window.location.href = `/public-profile?user=${encodeURIComponent(user.id)}`;
    });

    card.querySelector(".follow-user-btn")?.addEventListener("click", async (event) => {
      event.stopPropagation();

      const button = event.currentTarget;
      button.disabled = true;

      await toggleFollow(user.id);
      await loadDiscoveryPanels();
      renderUsers(users);

      if (currentFeedScope === "following") {
        await loadFeed();
      }
    });

    userResults.appendChild(card);
  });
}

function mirrorUserResultsToMobile() {
  if (!mobileUserResults || !userResults) return;

  mobileUserResults.innerHTML = userResults.innerHTML;

  mobileUserResults.querySelectorAll(".user-card").forEach((card, index) => {
    const desktopCard = userResults.querySelectorAll(".user-card")[index];
    const desktopButton = desktopCard?.querySelector(".follow-user-btn");

    card.addEventListener("click", () => {
      desktopCard?.click();
    });

    card.querySelector(".follow-user-btn")?.addEventListener("click", (event) => {
      event.stopPropagation();
      desktopButton?.click();
    });
  });
}

async function toggleFollow(userId) {
  const isFollowing = followingIds.includes(userId);

  if (isFollowing) {
    await deleteDoc(doc(db, "users", currentUser.uid, "following", userId));
    await deleteDoc(doc(db, "users", userId, "followers", currentUser.uid));
  } else {
    await setDoc(doc(db, "users", currentUser.uid, "following", userId), {
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, "users", userId, "followers", currentUser.uid), {
      createdAt: serverTimestamp()
    });
  }

  await loadFollowing();
}

async function uploadToCloudinary(file, folder = "vinyl/social") {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const response = await fetch(url, {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Erro no upload.");
  }

  return data.secure_url;
}

function clearComposer() {
  postText.value = "";
  spotifyUrlInput.value = "";
  mediaInput.value = "";
  mediaPreview.innerHTML = "";
  spotifyPreview.innerHTML = "";
  spotifyPreview.classList.remove("show");
  composerMorePanel.classList.remove("show");
  composerMoreMenu?.classList.remove("show");
  composerMoreBtn?.setAttribute("aria-expanded", "false");
  selectedFile = null;
}

function clearStoryComposer() {
  storyCaption.value = "";
  storyInput.value = "";
  storySelectedPreview.innerHTML = "";
  selectedStoryFile = null;
}

function updateStoryComposerState() {
  if (!storyPostBtn) return;

  storyPostBtn.disabled = !selectedStoryFile;
}

function updateComposerState() {
  const textLength = postText?.value.length || 0;
  const spotifyUrl = spotifyUrlInput?.value.trim() || "";
  const hasContent = Boolean(postText?.value.trim() || spotifyUrl || selectedFile);
  const spotifyIsValid = !spotifyUrl || isValidSpotifyUrl(spotifyUrl);

  if (charCounter) {
    charCounter.textContent = `${textLength}/${MAX_POST_LENGTH}`;
  }

  if (composerHint) {
    composerHint.textContent = spotifyIsValid
      ? "Adicione texto, mídia ou um link do Spotify."
      : "Use um link que comece com open.spotify.com.";
    composerHint.parentElement?.classList.toggle("warning", !spotifyIsValid);
  }

  renderSpotifyPreview(spotifyUrl, spotifyIsValid);

  if (postBtn) {
    postBtn.disabled = !hasContent || !spotifyIsValid || textLength > MAX_POST_LENGTH;
  }
}

function renderSpotifyPreview(url, isValid) {
  if (!spotifyPreview) return;

  spotifyPreview.innerHTML = "";
  spotifyPreview.classList.remove("show");

  if (!url || !isValid) return;

  spotifyPreview.classList.add("show");
  spotifyPreview.innerHTML = `
    <div class="spotify-preview-card">
      <div>
        <strong>Link do Spotify anexado</strong>
        <p>${escapeHtml(url)}</p>
      </div>

      <button type="button" id="removeSpotifyBtn" aria-label="Remover link do Spotify">×</button>
    </div>
  `;

  document.getElementById("removeSpotifyBtn")?.addEventListener("click", () => {
    spotifyUrlInput.value = "";
    updateComposerState();
  });
}

function isValidSpotifyUrl(url) {
  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === "open.spotify.com";
  } catch {
    return false;
  }
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "agora";

  return timestamp.toDate().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatStoryAge(timestamp) {
  const createdAt = timestamp?.toMillis?.();
  if (!createdAt) return "agora";

  const minutes = Math.max(1, Math.floor((Date.now() - createdAt) / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  return `${Math.floor(minutes / 60)} h`;
}

function getPostScore(post) {
  return (
    (post.likes?.length || post.likesCount || 0) +
    (post.reposts?.length || post.repostCount || 0) +
    (post.replyCount || 0)
  );
}

function renderPostText(text) {
  return escapeHtml(text).replace(
    /(^|\s)#([\p{L}\p{N}_-]+)/gu,
    (match, prefix, tag) =>
      `${prefix}<a href="search.html?q=${encodeURIComponent(tag)}" class="hashtag">#${tag}</a>`
  );
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text || "";
  return div.innerHTML;
}

function escapeAttribute(text) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function getFallbackAvatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=ff4d6d&color=fff`;
}

function normalizeArray(arr) {
  return arr
    .map((item) => String(item).toLowerCase().trim())
    .filter(Boolean);
}

function normalizeArtists(artists) {
  return artists
    .map((artist) => {
      if (typeof artist === "string") return artist;
      return artist.name || "";
    })
    .map((item) => item.toLowerCase().trim())
    .filter(Boolean);
}

function getVisibleArtists(artists, hiddenArtists) {
  return artists.filter((artist) => !isArtistHidden(artist, hiddenArtists));
}

function isArtistHidden(artist, hiddenArtists) {
  const artistKey = getArtistKey(artist);

  if (!artistKey) return false;

  return hiddenArtists.some((hiddenArtist) => getArtistKey(hiddenArtist) === artistKey);
}

function getArtistKey(artist) {
  if (!artist) return "";

  if (typeof artist === "string") return normalizeArray([artist])[0] || "";

  return normalizeArray([artist.id || artist.spotifyId || artist.name || ""])[0] || "";
}

function extractGenres(text, userData) {
  const base = normalizeArray(userData?.favoriteGenres || []);
  const lower = text.toLowerCase();

  const knownGenres = [
    "rock",
    "metal",
    "pop",
    "k-pop",
    "indie",
    "rap",
    "hip-hop",
    "r&b",
    "jazz",
    "mpb",
    "eletrônica",
    "dream pop"
  ];

  const found = knownGenres.filter((genre) => lower.includes(genre));

  return [...new Set([...base.slice(0, 2), ...found])];
}

function extractArtists(text, userData) {
  const lower = text.toLowerCase();
  const userArtists = getVisibleArtists(
    userData?.favoriteArtists || [],
    userData?.hiddenArtists || []
  );

  const found = userArtists
    .map((artist) => (typeof artist === "string" ? artist : artist.name))
    .filter((name) => name && lower.includes(name.toLowerCase()));

  return [...new Set(found)];
}


import {
  filterPostsByUserControls
} from "./controlFilters.js";
