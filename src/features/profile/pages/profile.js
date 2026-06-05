import { auth, db, storage } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* =========================
   ELEMENTOS
========================= */

const body = document.body;

const navbarLinks = document.getElementById("navbarLinks");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const logoutBtn = document.getElementById("logoutBtn");

const profileBanner = document.getElementById("profileBanner");
const changeBannerBtn = document.getElementById("changeBannerBtn");
const quickBannerInput = document.getElementById("quickBannerInput");

const profileAvatar = document.getElementById("profileAvatar");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");
const profileSocialLinks = document.getElementById("profileSocialLinks");

const currentTrackText = document.getElementById("currentTrackText");
const favoriteAlbumText = document.getElementById("favoriteAlbumText");
const topGenreText = document.getElementById("topGenreText");

const followersCount = document.getElementById("followersCount");
const followingCount = document.getElementById("followingCount");
const reviewsCount = document.getElementById("reviewsCount");
const favoritesCount = document.getElementById("favoritesCount");

const privateProfileBox = document.getElementById("privateProfileBox");

const favoriteGenresList = document.getElementById("favoriteGenresList");
const favoriteArtistsGrid = document.getElementById("favoriteArtistsGrid");
const favoriteAlbumsGrid = document.getElementById("favoriteAlbumsGrid");
const activityList = document.getElementById("activityList");
const reviewsList = document.getElementById("reviewsList");

const summaryTopArtist = document.getElementById("summaryTopArtist");
const summaryMood = document.getElementById("summaryMood");
const summaryCompatibility = document.getElementById("summaryCompatibility");

const editProfileBtn = document.getElementById("editProfileBtn");
const favoritesBtn = document.getElementById("favoritesBtn");
const shareProfileBtn = document.getElementById("shareProfileBtn");

const editProfileModal = document.getElementById("editProfileModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const editProfileForm = document.getElementById("editProfileForm");

const editDisplayName = document.getElementById("editDisplayName");
const editUsername = document.getElementById("editUsername");
const editBio = document.getElementById("editBio");
const bioCounter = document.getElementById("bioCounter");

const editPhotoFile = document.getElementById("editPhotoFile");
const editPhotoPreview = document.getElementById("editPhotoPreview");

const editBannerFile = document.getElementById("editBannerFile");
const editBannerPreview = document.getElementById("editBannerPreview");

const editCurrentTrack = document.getElementById("editCurrentTrack");
const editFavoriteArtist = document.getElementById("editFavoriteArtist");
const editFavoriteAlbum = document.getElementById("editFavoriteAlbum");
const editTopGenre = document.getElementById("editTopGenre");

const editX = document.getElementById("editX");
const editInstagram = document.getElementById("editInstagram");
const editFacebook = document.getElementById("editFacebook");
const editTikTok = document.getElementById("editTikTok");
const editYouTube = document.getElementById("editYouTube");
const editWebsite = document.getElementById("editWebsite");

const privacyModal = document.getElementById("privacyModal");
const openPrivacyModalBtn = document.getElementById("openPrivacyModalBtn");
const closePrivacyModalBtn = document.getElementById("closePrivacyModalBtn");
const privacyForm = document.getElementById("privacyForm");

const privateProfileToggle = document.getElementById("privateProfileToggle");
const allowDirectMessagesToggle = document.getElementById("allowDirectMessagesToggle");
const showActivityToggle = document.getElementById("showActivityToggle");
const showFavoritesToggle = document.getElementById("showFavoritesToggle");
const showReviewsToggle = document.getElementById("showReviewsToggle");
const searchableProfileToggle = document.getElementById("searchableProfileToggle");

const deleteAccountBtn = document.getElementById("deleteAccountBtn");

const toast = document.getElementById("toast");

const connectedProviderBox = document.getElementById("connectedProviderBox");
const connectedProviderText = document.getElementById("connectedProviderText");
const providerDot = document.querySelector(".provider-dot");

/* =========================
   ESTADO
========================= */

let currentUser = null;
let currentUserData = null;
let selectedPhotoFile = null;
let selectedBannerFile = null;

const fallbackAvatar = "https://placehold.co/300x300/111111/ff4d6d?text=VINYL";
const fallbackBanner = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80";
const fallbackCover = "https://placehold.co/300x300/111111/ff4d6d?text=♪";

/* =========================
   HELPERS
========================= */

function showToast(message) {
  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast._timer);

  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function safeText(value, fallback = "") {
  return String(value ?? fallback)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeValue(value, fallback = "") {
  return String(value ?? fallback);
}

function setText(element, value, fallback = "") {
  if (!element) return;
  element.textContent = value || fallback;
}

function setInputValue(element, value = "") {
  if (!element) return;
  element.value = value || "";
}

function setBannerImage(url) {
  const bannerUrl = url || fallbackBanner;

  if (profileBanner) {
    profileBanner.style.backgroundImage = `
      linear-gradient(135deg, rgba(255, 47, 125, .42), rgba(255, 45, 85, .10)),
      url("${bannerUrl}")
    `;
  }

  if (editBannerPreview) {
    editBannerPreview.style.backgroundImage = `
      linear-gradient(135deg, rgba(255, 47, 125, .28), rgba(255, 45, 85, .08)),
      url("${bannerUrl}")
    `;
  }
}

function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._]/g, "");
}

function normalizeUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function isValidProfileUrl(url) {
  if (!url) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function getDisplayName(data) {
  return data?.displayName || data?.name || currentUser?.displayName || "Usuário Vinyl";
}

function getUsername(data) {
  return data?.username || currentUser?.email?.split("@")[0] || "usuario";
}

function getAvatar(data) {
  return data?.photoURL || data?.avatar || currentUser?.photoURL || fallbackAvatar;
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function formatDate(timestamp) {
  if (!timestamp) return "agora";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "agora";
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function openModal(modal) {
  if (!modal) return;
  modal.hidden = false;
  body?.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) return;
  modal.hidden = true;

  const anyOpenModal = document.querySelector(".modal-overlay:not([hidden])");

  if (!anyOpenModal) {
    body?.classList.remove("modal-open");
  }
}

async function uploadImage(file, folder) {
  if (!file || !currentUser) return null;

  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo inválido. Envie uma imagem.");
  }

  const maxSizeMB = 6;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    throw new Error(`Imagem muito pesada. Use até ${maxSizeMB}MB.`);
  }

  const extension = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const storageRef = ref(storage, `${folder}/${currentUser.uid}/${fileName}`);

  await uploadBytes(storageRef, file);

  return await getDownloadURL(storageRef);
}

/* =========================
   NAVBAR
========================= */

mobileMenuBtn?.addEventListener("click", () => {
  navbarLinks?.classList.toggle("open");
});

navbarLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navbarLinks.classList.remove("open");
  });
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Erro ao sair:", error);
    showToast("Erro ao sair da conta.");
  }
});

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await loadProfile();
  await loadUserContent();
});

/* =========================
   LOAD PROFILE
========================= */

async function loadProfile() {
  if (!currentUser) return;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    const localProvider = localStorage.getItem("vinyl_music_provider") || "none";

    if (!userSnap.exists()) {
      currentUserData = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || "Usuário Vinyl",
        username: normalizeUsername(currentUser.email?.split("@")[0] || "usuario"),
        usernameLower: normalizeUsername(currentUser.email?.split("@")[0] || "usuario"),
        email: currentUser.email || "",
        photoURL: currentUser.photoURL || "",
        bannerURL: "",
        bio: "",
        currentTrack: "",
        favoriteArtist: "",
        favoriteAlbum: "",
        topGenre: "",
        favoriteGenres: [],
        favoriteArtists: [],
        favoriteAlbums: [],
        musicProvider: localProvider,
        socialLinks: {
          x: "",
          instagram: "",
          facebook: "",
          tiktok: "",
          youtube: "",
          website: ""
        },
        privacy: {
          privateProfile: false,
          allowDirectMessages: true,
          showActivity: true,
          showFavorites: true,
          showReviews: true,
          searchableProfile: true
        },
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(userRef, currentUserData, { merge: true });
    } else {
      currentUserData = {
        uid: currentUser.uid,
        ...userSnap.data()
      };

      if (localProvider && localProvider !== "none" && currentUserData.musicProvider !== localProvider) {
        currentUserData.musicProvider = localProvider;

        await updateDoc(userRef, {
          musicProvider: localProvider,
          updatedAt: serverTimestamp()
        });
      }
    }

    renderProfile();
    renderMusicProvider();
    fillEditModal();
    fillPrivacyModal();
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    showToast("Não foi possível carregar seu perfil.");
  }
}

function renderProfile() {
  if (!currentUserData) return;

  const displayName = getDisplayName(currentUserData);
  const username = getUsername(currentUserData);
  const avatar = getAvatar(currentUserData);
  const banner = currentUserData?.bannerURL || currentUserData?.banner || fallbackBanner;

  if (profileAvatar) {
    profileAvatar.src = avatar;
    profileAvatar.onerror = () => {
      profileAvatar.src = fallbackAvatar;
    };
  }

  setText(profileDisplayName, displayName, "Usuário Vinyl");
  setText(profileUsername, `@${username}`, "@usuario");
  setText(profileBio, currentUserData?.bio, "Sua bio musical aparecerá aqui.");

  setBannerImage(banner);
  renderSocialLinks();

  setText(currentTrackText, currentUserData?.currentTrack, "Nenhuma música");
  setText(favoriteAlbumText, currentUserData?.favoriteAlbum, "Não definido");
  setText(topGenreText, currentUserData?.topGenre, "Não definido");

  const followersTotal =
    currentUserData?.followersCount ?? countArray(currentUserData?.followers);

  const followingTotal =
    currentUserData?.followingCount ?? countArray(currentUserData?.following);

  setText(followersCount, followersTotal, "0");
  setText(followingCount, followingTotal, "0");

  const favoriteTotal =
    countArray(currentUserData?.favoriteArtists) +
    countArray(currentUserData?.favoriteAlbums) +
    countArray(currentUserData?.favoriteGenres);

  setText(favoritesCount, favoriteTotal, "0");

  const privateProfile = Boolean(currentUserData?.privacy?.privateProfile);

  if (privateProfileBox) {
    privateProfileBox.hidden = !privateProfile;
  }

  renderGenres(currentUserData?.favoriteGenres || []);
  renderArtists(currentUserData?.favoriteArtists || []);
  renderAlbums(currentUserData?.favoriteAlbums || []);

  setText(
    summaryTopArtist,
    currentUserData?.favoriteArtist ||
      currentUserData?.favoriteArtists?.[0]?.name ||
      currentUserData?.favoriteArtists?.[0],
    "Ainda sem dados"
  );

  setText(
    summaryMood,
    currentUserData?.topGenre ? `Vibe ${currentUserData.topGenre}` : "Descobrindo sons",
    "Descobrindo sons"
  );

  setText(
    summaryCompatibility,
    currentUserData?.compatibilityScore ? `${currentUserData.compatibilityScore}%` : "--%",
    "--%"
  );
}

/* =========================
   MUSIC PROVIDER
========================= */

function getMusicProvider() {
  return currentUserData?.musicProvider || localStorage.getItem("vinyl_music_provider") || "none";
}

function renderMusicProvider() {
  const provider = getMusicProvider();

  if (!connectedProviderText) return;

  if (connectedProviderBox) {
    connectedProviderBox.dataset.provider = provider;
  }

  if (providerDot) {
    providerDot.style.background = "#747484";
    providerDot.style.boxShadow = "none";
  }

  if (provider === "spotify") {
    connectedProviderText.textContent = "Spotify conectado";

    if (providerDot) {
      providerDot.style.background = "#1ed760";
      providerDot.style.boxShadow = "0 0 16px rgba(30, 215, 96, .8)";
    }

    return;
  }

  if (provider === "apple_music") {
    connectedProviderText.textContent = "Apple Music selecionado";

    if (providerDot) {
      providerDot.style.background = "#f5f5f7";
      providerDot.style.boxShadow = "0 0 16px rgba(255, 255, 255, .65)";
    }

    return;
  }

  connectedProviderText.textContent = "Nenhuma plataforma conectada";
}

/* =========================
   SOCIAL LINKS
========================= */

function renderSocialLinks() {
  if (!profileSocialLinks) return;

  const links = currentUserData?.socialLinks || {};

  const socials = [
    {
      key: "x",
      label: "X",
      icon: "𝕏",
      url: links.x
    },
    {
      key: "instagram",
      label: "Instagram",
      icon: "📸",
      url: links.instagram
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: "f",
      url: links.facebook
    },
    {
      key: "tiktok",
      label: "TikTok",
      icon: "♪",
      url: links.tiktok
    },
    {
      key: "youtube",
      label: "YouTube",
      icon: "▶",
      url: links.youtube
    },
    {
      key: "website",
      label: "Site",
      icon: "🔗",
      url: links.website
    }
  ];

  const activeSocials = socials.filter((item) => item.url);

  if (!activeSocials.length) {
    profileSocialLinks.innerHTML = "";
    return;
  }

  profileSocialLinks.innerHTML = activeSocials.map((item) => `
    <a
      class="social-link social-link-${safeText(item.key)}"
      href="${safeText(item.url)}"
      target="_blank"
      rel="noopener noreferrer"
      title="${safeText(item.label)}"
    >
      <span>${safeText(item.icon)}</span>
      ${safeText(item.label)}
    </a>
  `).join("");
}

/* =========================
   FAVORITES
========================= */

function renderGenres(genres) {
  if (!favoriteGenresList) return;

  if (!Array.isArray(genres) || !genres.length) {
    favoriteGenresList.innerHTML = `<span class="empty-state">Nenhum gênero favorito ainda.</span>`;
    return;
  }

  favoriteGenresList.innerHTML = genres.map((genre) => {
    const name = typeof genre === "string" ? genre : genre?.name;
    const icon = typeof genre === "object" && genre?.icon ? genre.icon : "🎧";

    return `
      <span class="genre-chip">
        ${safeText(icon)} ${safeText(name || "Gênero")}
      </span>
    `;
  }).join("");
}

function renderArtists(artists) {
  if (!favoriteArtistsGrid) return;

  if (!Array.isArray(artists) || !artists.length) {
    favoriteArtistsGrid.innerHTML = `<span class="empty-state">Nenhum artista favorito ainda.</span>`;
    return;
  }

  favoriteArtistsGrid.innerHTML = artists.map((artist, index) => {
    const item = typeof artist === "string"
      ? { name: artist, image: fallbackCover, subtitle: "Artista" }
      : artist || {};

    return `
      <article class="music-card">
        <span class="music-card-rank">#${index + 1}</span>

        <img
          src="${safeText(item.image || item.photoURL || item.cover || fallbackCover)}"
          alt="${safeText(item.name || "Artista")}"
          loading="lazy"
          onerror="this.src='${fallbackCover}'"
        >

        <div class="music-card-body">
          <strong>${safeText(item.name || "Artista")}</strong>
          <span>${safeText(item.subtitle || "Artista favorito")}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderAlbums(albums) {
  if (!favoriteAlbumsGrid) return;

  if (!Array.isArray(albums) || !albums.length) {
    favoriteAlbumsGrid.innerHTML = `<span class="empty-state">Nenhum álbum favorito ainda.</span>`;
    return;
  }

  favoriteAlbumsGrid.innerHTML = albums.map((album, index) => {
    const item = typeof album === "string"
      ? { name: album, image: fallbackCover, subtitle: "Álbum" }
      : album || {};

    return `
      <article class="music-card">
        <span class="music-card-rank">#${index + 1}</span>

        <img
          src="${safeText(item.image || item.cover || item.photoURL || fallbackCover)}"
          alt="${safeText(item.name || item.title || "Álbum")}"
          loading="lazy"
          onerror="this.src='${fallbackCover}'"
        >

        <div class="music-card-body">
          <strong>${safeText(item.name || item.title || "Álbum")}</strong>
          <span>${safeText(item.artist || item.subtitle || "Álbum favorito")}</span>
        </div>
      </article>
    `;
  }).join("");
}

/* =========================
   CONTENT
========================= */

async function loadUserContent() {
  await Promise.allSettled([
    loadReviews(),
    loadActivity()
  ]);
}

async function loadReviews() {
  if (!reviewsList || !currentUser) return;

  try {
    const reviewsQuery = query(
      collection(db, "reviews"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const snapshot = await getDocs(reviewsQuery);

    const reviews = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    setText(reviewsCount, reviews.length, "0");
    renderReviews(reviews);
  } catch (error) {
    console.warn("Erro ao carregar reviews:", error);

    setText(reviewsCount, "0");

    reviewsList.innerHTML = `
      <span class="empty-state">
        Nenhuma review publicada ainda.
      </span>
    `;
  }
}

function renderReviews(reviews) {
  if (!reviewsList) return;

  if (!Array.isArray(reviews) || !reviews.length) {
    reviewsList.innerHTML = `
      <span class="empty-state">Nenhuma review publicada ainda.</span>
    `;
    return;
  }

  reviewsList.innerHTML = reviews.map((review) => {
    const rating = Math.max(0, Math.min(5, Number(review.rating || 0)));
    const stars = "★★★★★".slice(0, rating).padEnd(5, "☆");

    return `
      <article class="review-card">
        <img
          src="${safeText(review.cover || review.image || fallbackCover)}"
          alt="${safeText(review.title || "Review")}"
          loading="lazy"
          onerror="this.src='${fallbackCover}'"
        >

        <div class="review-card-content">
          <span>Review · ${safeText(formatDate(review.createdAt))}</span>

          <h3>${safeText(review.title || review.albumName || review.itemName || "Review musical")}</h3>

          <div class="rating">${safeText(stars)}</div>

          <p>${safeText(review.text || review.content || review.reviewText || "Sem texto.")}</p>

          <div class="review-actions">
            <button type="button">♡ Curtir</button>
            <button type="button">💬 Comentar</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function loadActivity() {
  if (!activityList || !currentUser) return;

  try {
    const activityQuery = query(
      collection(db, "activities"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const snapshot = await getDocs(activityQuery);

    const activities = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderActivity(activities);
  } catch (error) {
    console.warn("Erro ao carregar atividade:", error);

    activityList.innerHTML = `
      <article class="activity-card">
        <span>🎧</span>
        <p>As atividades musicais aparecerão aqui.</p>
      </article>
    `;
  }
}

function renderActivity(activities) {
  if (!activityList) return;

  if (!Array.isArray(activities) || !activities.length) {
    activityList.innerHTML = `
      <article class="activity-card">
        <span>🎧</span>
        <p>As atividades musicais aparecerão aqui.</p>
      </article>
    `;
    return;
  }

  activityList.innerHTML = activities.map((activity) => {
    const icon = activity.icon || getActivityIcon(activity.type);

    return `
      <article class="activity-card">
        <span>${safeText(icon)}</span>
        <p>${safeText(activity.message || "Nova atividade musical.")}</p>
      </article>
    `;
  }).join("");
}

function getActivityIcon(type) {
  const icons = {
    favorite: "❤️",
    review: "⭐",
    follow: "👤",
    listen: "🎧",
    repost: "🔁",
    comment: "💬"
  };

  return icons[type] || "🎧";
}

/* =========================
   TABS
========================= */

const tabButtons = document.querySelectorAll(".profile-tabs button");
const tabPanels = document.querySelectorAll(".profile-tab-panel");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabPanels.forEach((panel) => panel.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(`${tab}Tab`)?.classList.add("active");
  });
});

favoritesBtn?.addEventListener("click", () => {
  window.location.href = "favorites.html";
});

/* =========================
   EDIT MODAL
========================= */

function openEditModal() {
  if (!editProfileModal) return;

  fillEditModal();
  openModal(editProfileModal);
}

function closeEditModal() {
  closeModal(editProfileModal);
}

editProfileBtn?.addEventListener("click", openEditModal);
closeEditModalBtn?.addEventListener("click", closeEditModal);

editProfileModal?.addEventListener("click", (event) => {
  if (event.target === editProfileModal) {
    closeEditModal();
  }
});

function fillEditModal() {
  if (!currentUserData) return;

  setInputValue(editDisplayName, getDisplayName(currentUserData));
  setInputValue(editUsername, getUsername(currentUserData));
  setInputValue(editBio, currentUserData.bio || "");

  if (bioCounter) {
    bioCounter.textContent = editBio?.value.length || 0;
  }

  if (editPhotoPreview) {
    editPhotoPreview.src = getAvatar(currentUserData);
    editPhotoPreview.onerror = () => {
      editPhotoPreview.src = fallbackAvatar;
    };
  }

  setInputValue(editCurrentTrack, currentUserData.currentTrack || "");
  setInputValue(editFavoriteArtist, currentUserData.favoriteArtist || "");
  setInputValue(editFavoriteAlbum, currentUserData.favoriteAlbum || "");
  setInputValue(editTopGenre, currentUserData.topGenre || "");

  const socialLinks = currentUserData?.socialLinks || {};

  setInputValue(editX, socialLinks.x || "");
  setInputValue(editInstagram, socialLinks.instagram || "");
  setInputValue(editFacebook, socialLinks.facebook || "");
  setInputValue(editTikTok, socialLinks.tiktok || "");
  setInputValue(editYouTube, socialLinks.youtube || "");
  setInputValue(editWebsite, socialLinks.website || "");

  setBannerImage(currentUserData.bannerURL || currentUserData.banner || fallbackBanner);
}

editBio?.addEventListener("input", () => {
  if (bioCounter) {
    bioCounter.textContent = editBio.value.length;
  }
});

editUsername?.addEventListener("input", () => {
  editUsername.value = normalizeUsername(editUsername.value);
});

editPhotoFile?.addEventListener("change", () => {
  const file = editPhotoFile.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Escolha uma imagem válida.");
    editPhotoFile.value = "";
    return;
  }

  selectedPhotoFile = file;

  const previewURL = URL.createObjectURL(file);

  if (editPhotoPreview) {
    editPhotoPreview.src = previewURL;
  }
});

editBannerFile?.addEventListener("change", () => {
  const file = editBannerFile.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Escolha uma imagem válida.");
    editBannerFile.value = "";
    return;
  }

  selectedBannerFile = file;

  const previewURL = URL.createObjectURL(file);

  if (editBannerPreview) {
    editBannerPreview.style.backgroundImage = `
      linear-gradient(135deg, rgba(255, 47, 125, .28), rgba(255, 45, 85, .08)),
      url("${previewURL}")
    `;
  }
});

editProfileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || !currentUserData) return;

  const displayNameValue = editDisplayName?.value.trim() || "";
  const usernameValue = normalizeUsername(editUsername?.value);
  const bioValue = editBio?.value.trim() || "";

  if (!displayNameValue) {
    showToast("Digite um nome de exibição.");
    return;
  }

  if (!usernameValue || usernameValue.length < 3) {
    showToast("O nome de usuário precisa ter pelo menos 3 caracteres.");
    return;
  }

  const socialLinks = {
    x: normalizeUrl(editX?.value),
    instagram: normalizeUrl(editInstagram?.value),
    facebook: normalizeUrl(editFacebook?.value),
    tiktok: normalizeUrl(editTikTok?.value),
    youtube: normalizeUrl(editYouTube?.value),
    website: normalizeUrl(editWebsite?.value)
  };

  const invalidSocial = Object.values(socialLinks).find((url) => {
    return url && !isValidProfileUrl(url);
  });

  if (invalidSocial) {
    showToast("Um dos links sociais não é válido.");
    return;
  }

  const submitBtn = editProfileForm.querySelector("button[type='submit']");
  const oldSubmitText = submitBtn?.textContent || "Salvar alterações";

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";
  }

  try {
    let photoURL = currentUserData?.photoURL || currentUserData?.avatar || "";
    let bannerURL = currentUserData?.bannerURL || currentUserData?.banner || "";

    if (selectedPhotoFile) {
      photoURL = await uploadImage(selectedPhotoFile, "profilePhotos");
    }

    if (selectedBannerFile) {
      bannerURL = await uploadImage(selectedBannerFile, "profileBanners");
    }

    const updates = {
      displayName: displayNameValue,
      username: usernameValue,
      usernameLower: usernameValue.toLowerCase(),
      bio: bioValue,
      photoURL,
      bannerURL,
      currentTrack: editCurrentTrack?.value.trim() || "",
      favoriteArtist: editFavoriteArtist?.value.trim() || "",
      favoriteAlbum: editFavoriteAlbum?.value.trim() || "",
      topGenre: editTopGenre?.value.trim() || "",
      socialLinks,
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, "users", currentUser.uid), updates);

    currentUserData = {
      ...currentUserData,
      ...updates
    };

    selectedPhotoFile = null;
    selectedBannerFile = null;

    if (editPhotoFile) editPhotoFile.value = "";
    if (editBannerFile) editBannerFile.value = "";

    renderProfile();
    renderMusicProvider();
    closeEditModal();

    showToast("Perfil atualizado!");
  } catch (error) {
    console.error("Erro ao salvar perfil:", error);

    if (String(error?.message || "").includes("Imagem muito pesada")) {
      showToast(error.message);
    } else if (String(error?.message || "").includes("Arquivo inválido")) {
      showToast(error.message);
    } else {
      showToast("Não foi possível salvar o perfil.");
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = oldSubmitText;
    }
  }
});

/* =========================
   QUICK BANNER
========================= */

changeBannerBtn?.addEventListener("click", () => {
  quickBannerInput?.click();
});

quickBannerInput?.addEventListener("change", async () => {
  const file = quickBannerInput.files?.[0];

  if (!file || !currentUser) return;

  if (!file.type.startsWith("image/")) {
    showToast("Escolha uma imagem válida.");
    quickBannerInput.value = "";
    return;
  }

  try {
    showToast("Enviando banner...");

    const bannerURL = await uploadImage(file, "profileBanners");

    await updateDoc(doc(db, "users", currentUser.uid), {
      bannerURL,
      updatedAt: serverTimestamp()
    });

    currentUserData = {
      ...currentUserData,
      bannerURL
    };

    setBannerImage(bannerURL);
    showToast("Banner atualizado!");
  } catch (error) {
    console.error("Erro ao trocar banner:", error);

    if (String(error?.message || "").includes("Imagem muito pesada")) {
      showToast(error.message);
    } else {
      showToast("Não foi possível atualizar o banner.");
    }
  } finally {
    quickBannerInput.value = "";
  }
});

/* =========================
   PRIVACY
========================= */

function openPrivacyModal() {
  if (!privacyModal) return;

  fillPrivacyModal();
  openModal(privacyModal);
}

function closePrivacyModal() {
  closeModal(privacyModal);
}

openPrivacyModalBtn?.addEventListener("click", openPrivacyModal);
closePrivacyModalBtn?.addEventListener("click", closePrivacyModal);

privacyModal?.addEventListener("click", (event) => {
  if (event.target === privacyModal) {
    closePrivacyModal();
  }
});

function fillPrivacyModal() {
  const privacy = currentUserData?.privacy || {};

  if (privateProfileToggle) {
    privateProfileToggle.checked = Boolean(privacy.privateProfile);
  }

  if (allowDirectMessagesToggle) {
    allowDirectMessagesToggle.checked = privacy.allowDirectMessages !== false;
  }

  if (showActivityToggle) {
    showActivityToggle.checked = privacy.showActivity !== false;
  }

  if (showFavoritesToggle) {
    showFavoritesToggle.checked = privacy.showFavorites !== false;
  }

  if (showReviewsToggle) {
    showReviewsToggle.checked = privacy.showReviews !== false;
  }

  if (searchableProfileToggle) {
    searchableProfileToggle.checked = privacy.searchableProfile !== false;
  }
}

privacyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || !currentUserData) return;

  const updates = {
    privacy: {
      privateProfile: Boolean(privateProfileToggle?.checked),
      allowDirectMessages: Boolean(allowDirectMessagesToggle?.checked),
      showActivity: Boolean(showActivityToggle?.checked),
      showFavorites: Boolean(showFavoritesToggle?.checked),
      showReviews: Boolean(showReviewsToggle?.checked),
      searchableProfile: Boolean(searchableProfileToggle?.checked)
    },
    updatedAt: serverTimestamp()
  };

  const submitBtn = privacyForm.querySelector("button[type='submit']");
  const oldSubmitText = submitBtn?.textContent || "Salvar privacidade";

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";
  }

  try {
    await updateDoc(doc(db, "users", currentUser.uid), updates);

    currentUserData = {
      ...currentUserData,
      privacy: updates.privacy
    };

    renderProfile();
    closePrivacyModal();

    showToast("Privacidade atualizada!");
  } catch (error) {
    console.error("Erro ao salvar privacidade:", error);
    showToast("Não foi possível salvar a privacidade.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = oldSubmitText;
    }
  }
});

/* =========================
   SHARE
========================= */

shareProfileBtn?.addEventListener("click", async () => {
  const username = getUsername(currentUserData);
  const url = `${window.location.origin}/public-profile.html?u=${encodeURIComponent(username)}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Meu perfil no Vinyl",
        text: "Olha meu perfil musical no Vinyl!",
        url
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast("Link do perfil copiado!");
    } else {
      showToast(url);
    }
  } catch (error) {
    console.warn("Compartilhamento cancelado ou falhou:", error);
  }
});

/* =========================
   DELETE ACCOUNT
========================= */

deleteAccountBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const firstConfirm = confirm("Tem certeza que deseja excluir sua conta?");
  if (!firstConfirm) return;

  const typed = prompt('Digite "EXCLUIR" para confirmar:');

  if (typed !== "EXCLUIR") {
    showToast("Exclusão cancelada.");
    return;
  }

  try {
    await deleteDoc(doc(db, "users", currentUser.uid));
    await deleteUser(currentUser);

    showToast("Conta excluída.");
    window.location.href = "register.html";
  } catch (error) {
    console.error("Erro ao excluir conta:", error);

    if (error?.code === "auth/requires-recent-login") {
      showToast("Faça login novamente para excluir a conta.");
    } else {
      showToast("Erro ao excluir. Faça login novamente e tente de novo.");
    }
  }
});

/* =========================
   GLOBAL EVENTS
========================= */

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (editProfileModal && !editProfileModal.hidden) {
    closeEditModal();
  }

  if (privacyModal && !privacyModal.hidden) {
    closePrivacyModal();
  }
});

/* =========================
   DEBUG LEVE
========================= */

window.vinylProfileDebug = {
  getCurrentUser: () => currentUser,
  getCurrentUserData: () => currentUserData,
  reloadProfile: loadProfile,
  renderMusicProvider
};