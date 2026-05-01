/* ===============================
   VINYL PROFILE JS
   Ajuste o caminho do firebase.js se necessário.
================================ */

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

/* ===============================
   ELEMENTOS
================================ */

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

/* ===============================
   ESTADO
================================ */

let currentUser = null;
let currentUserData = null;
let selectedPhotoFile = null;
let selectedBannerFile = null;

const fallbackAvatar = "https://placehold.co/300x300/111111/ff4d6d?text=VINYL";
const fallbackBanner = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80";
const fallbackCover = "https://placehold.co/300x300/111111/ff4d6d?text=♪";

/* ===============================
   HELPERS
================================ */

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

function setBannerImage(url) {
  const bannerUrl = url || fallbackBanner;

  if (profileBanner) {
    profileBanner.style.backgroundImage = `
      linear-gradient(135deg, rgba(255, 63, 127, .42), rgba(255, 45, 85, .10)),
      url("${bannerUrl}")
    `;
  }

  if (editBannerPreview) {
    editBannerPreview.style.backgroundImage = `
      linear-gradient(135deg, rgba(255, 63, 127, .28), rgba(255, 45, 85, .08)),
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
  return date.toLocaleDateString("pt-BR");
}

async function uploadImage(file, folder) {
  if (!file || !currentUser) return null;

  const extension = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const storageRef = ref(storage, `${folder}/${currentUser.uid}/${fileName}`);

  await uploadBytes(storageRef, file);

  return await getDownloadURL(storageRef);
}

/* ===============================
   NAVBAR
================================ */

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

/* ===============================
   AUTH
================================ */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await loadProfile();
  await loadUserContent();
});

/* ===============================
   LOAD PROFILE
================================ */

async function loadProfile() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      currentUserData = {
        displayName: currentUser.displayName || "Usuário Vinyl",
        username: currentUser.email?.split("@")[0] || "usuario",
        photoURL: currentUser.photoURL || "",
        bannerURL: "",
        bio: "",
        favoriteGenres: [],
        favoriteArtists: [],
        favoriteAlbums: [],
        privacy: {
          privateProfile: false,
          allowDirectMessages: true,
          showActivity: true,
          showFavorites: true,
          showReviews: true,
          searchableProfile: true
        },
        createdAt: serverTimestamp()
      };

      await setDoc(userRef, currentUserData, { merge: true });
    } else {
      currentUserData = userSnap.data();
    }

    renderProfile();
    fillEditModal();
    fillPrivacyModal();
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    showToast("Não foi possível carregar seu perfil.");
  }
}

function renderProfile() {
  const displayName = getDisplayName(currentUserData);
  const username = getUsername(currentUserData);
  const avatar = getAvatar(currentUserData);
  const banner = currentUserData?.bannerURL || currentUserData?.banner || fallbackBanner;

  if (profileAvatar) profileAvatar.src = avatar;
  if (profileDisplayName) profileDisplayName.textContent = displayName;
  if (profileUsername) profileUsername.textContent = `@${username}`;
  if (profileBio) {
    profileBio.textContent = currentUserData?.bio || "Sua bio musical aparecerá aqui.";
  }

  setBannerImage(banner);

  if (currentTrackText) {
    currentTrackText.textContent = currentUserData?.currentTrack || "Nenhuma música";
  }

  if (favoriteAlbumText) {
    favoriteAlbumText.textContent = currentUserData?.favoriteAlbum || "Não definido";
  }

  if (topGenreText) {
    topGenreText.textContent = currentUserData?.topGenre || "Não definido";
  }

  if (followersCount) {
    followersCount.textContent =
      currentUserData?.followersCount ?? countArray(currentUserData?.followers);
  }

  if (followingCount) {
    followingCount.textContent =
      currentUserData?.followingCount ?? countArray(currentUserData?.following);
  }

  const favoriteTotal =
    countArray(currentUserData?.favoriteArtists) +
    countArray(currentUserData?.favoriteAlbums) +
    countArray(currentUserData?.favoriteGenres);

  if (favoritesCount) favoritesCount.textContent = favoriteTotal;

  const privateProfile = Boolean(currentUserData?.privacy?.privateProfile);

  if (privateProfileBox) {
    privateProfileBox.hidden = !privateProfile;
  }

  renderGenres(currentUserData?.favoriteGenres || []);
  renderArtists(currentUserData?.favoriteArtists || []);
  renderAlbums(currentUserData?.favoriteAlbums || []);

  if (summaryTopArtist) {
    summaryTopArtist.textContent =
      currentUserData?.favoriteArtist ||
      currentUserData?.favoriteArtists?.[0]?.name ||
      currentUserData?.favoriteArtists?.[0] ||
      "Ainda sem dados";
  }

  if (summaryMood) {
    summaryMood.textContent = currentUserData?.topGenre
      ? `Vibe ${currentUserData.topGenre}`
      : "Descobrindo sons";
  }

  if (summaryCompatibility) {
    summaryCompatibility.textContent = currentUserData?.compatibilityScore
      ? `${currentUserData.compatibilityScore}%`
      : "--%";
  }
}

/* ===============================
   RENDER FAVORITES
================================ */

function renderGenres(genres) {
  if (!favoriteGenresList) return;

  if (!genres.length) {
    favoriteGenresList.innerHTML = `<span class="empty-state">Nenhum gênero favorito ainda.</span>`;
    return;
  }

  favoriteGenresList.innerHTML = genres.map((genre) => {
    const name = typeof genre === "string" ? genre : genre.name;
    const icon = typeof genre === "object" && genre.icon ? genre.icon : "🎧";

    return `
      <span class="genre-chip">
        ${safeText(icon)} ${safeText(name)}
      </span>
    `;
  }).join("");
}

function renderArtists(artists) {
  if (!favoriteArtistsGrid) return;

  if (!artists.length) {
    favoriteArtistsGrid.innerHTML = `<span class="empty-state">Nenhum artista favorito ainda.</span>`;
    return;
  }

  favoriteArtistsGrid.innerHTML = artists.map((artist, index) => {
    const item = typeof artist === "string"
      ? { name: artist, image: fallbackCover, subtitle: "Artista" }
      : artist;

    return `
      <article class="music-card">
        <span class="music-card-rank">#${index + 1}</span>

        <img src="${safeText(item.image || item.photoURL || fallbackCover)}" alt="${safeText(item.name || "Artista")}">

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

  if (!albums.length) {
    favoriteAlbumsGrid.innerHTML = `<span class="empty-state">Nenhum álbum favorito ainda.</span>`;
    return;
  }

  favoriteAlbumsGrid.innerHTML = albums.map((album, index) => {
    const item = typeof album === "string"
      ? { name: album, image: fallbackCover, subtitle: "Álbum" }
      : album;

    return `
      <article class="music-card">
        <span class="music-card-rank">#${index + 1}</span>

        <img src="${safeText(item.image || item.cover || fallbackCover)}" alt="${safeText(item.name || "Álbum")}">

        <div class="music-card-body">
          <strong>${safeText(item.name || item.title || "Álbum")}</strong>
          <span>${safeText(item.artist || item.subtitle || "Álbum favorito")}</span>
        </div>
      </article>
    `;
  }).join("");
}

/* ===============================
   LOAD USER CONTENT
================================ */

async function loadUserContent() {
  await Promise.all([
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

    if (reviewsCount) {
      reviewsCount.textContent = reviews.length;
    }

    renderReviews(reviews);
  } catch (error) {
    console.warn("Erro ao carregar reviews:", error);

    reviewsList.innerHTML = `
      <span class="empty-state">Nenhuma review publicada ainda.</span>
    `;
  }
}

function renderReviews(reviews) {
  if (!reviewsList) return;

  if (!reviews.length) {
    reviewsList.innerHTML = `
      <span class="empty-state">Nenhuma review publicada ainda.</span>
    `;
    return;
  }

  reviewsList.innerHTML = reviews.map((review) => {
    const rating = Number(review.rating || 0);
    const stars = "★★★★★".slice(0, rating).padEnd(5, "☆");

    return `
      <article class="review-card">
        <img src="${safeText(review.cover || review.image || fallbackCover)}" alt="${safeText(review.title || "Review")}">

        <div class="review-card-content">
          <span>Review · ${formatDate(review.createdAt)}</span>
          <h3>${safeText(review.title || review.albumName || "Review musical")}</h3>

          <div class="rating">${safeText(stars)}</div>

          <p>${safeText(review.text || review.content || "Sem texto.")}</p>

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

  if (!activities.length) {
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
    repost: "🔁"
  };

  return icons[type] || "🎧";
}

/* ===============================
   TABS
================================ */

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
  document.querySelector('[data-tab="favorites"]')?.click();
});

/* ===============================
   EDIT MODAL
================================ */

function openEditModal() {
  if (!editProfileModal) return;

  fillEditModal();
  editProfileModal.hidden = false;
}

function closeEditModal() {
  if (!editProfileModal) return;

  editProfileModal.hidden = true;
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

  if (editDisplayName) editDisplayName.value = getDisplayName(currentUserData);
  if (editUsername) editUsername.value = getUsername(currentUserData);
  if (editBio) editBio.value = currentUserData.bio || "";
  if (bioCounter) bioCounter.textContent = editBio?.value.length || 0;

  if (editPhotoPreview) {
    editPhotoPreview.src = getAvatar(currentUserData);
  }

  if (editCurrentTrack) {
    editCurrentTrack.value = currentUserData.currentTrack || "";
  }

  if (editFavoriteArtist) {
    editFavoriteArtist.value = currentUserData.favoriteArtist || "";
  }

  if (editFavoriteAlbum) {
    editFavoriteAlbum.value = currentUserData.favoriteAlbum || "";
  }

  if (editTopGenre) {
    editTopGenre.value = currentUserData.topGenre || "";
  }

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

  selectedPhotoFile = file;

  const previewURL = URL.createObjectURL(file);

  if (editPhotoPreview) {
    editPhotoPreview.src = previewURL;
  }
});

editBannerFile?.addEventListener("change", () => {
  const file = editBannerFile.files?.[0];

  if (!file) return;

  selectedBannerFile = file;

  const previewURL = URL.createObjectURL(file);

  if (editBannerPreview) {
    editBannerPreview.style.backgroundImage = `
      linear-gradient(135deg, rgba(255, 63, 127, .28), rgba(255, 45, 85, .08)),
      url("${previewURL}")
    `;
  }
});

editProfileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const displayNameValue = editDisplayName.value.trim();
  const usernameValue = normalizeUsername(editUsername.value);
  const bioValue = editBio.value.trim();

  if (!displayNameValue) {
    showToast("Digite um nome de exibição.");
    return;
  }

  if (!usernameValue || usernameValue.length < 3) {
    showToast("O nome de usuário precisa ter pelo menos 3 caracteres.");
    return;
  }

  const submitBtn = editProfileForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvando...";

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
      currentTrack: editCurrentTrack.value.trim(),
      favoriteArtist: editFavoriteArtist.value.trim(),
      favoriteAlbum: editFavoriteAlbum.value.trim(),
      topGenre: editTopGenre.value.trim(),
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, "users", currentUser.uid), updates);

    currentUserData = {
      ...currentUserData,
      ...updates
    };

    selectedPhotoFile = null;
    selectedBannerFile = null;

    renderProfile();
    closeEditModal();
    showToast("Perfil atualizado!");
  } catch (error) {
    console.error("Erro ao salvar perfil:", error);
    showToast("Não foi possível salvar o perfil.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar alterações";
  }
});

/* ===============================
   QUICK BANNER
================================ */

changeBannerBtn?.addEventListener("click", () => {
  quickBannerInput?.click();
});

quickBannerInput?.addEventListener("change", async () => {
  const file = quickBannerInput.files?.[0];

  if (!file || !currentUser) return;

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
    showToast("Não foi possível atualizar o banner.");
  }
});

/* ===============================
   PRIVACY
================================ */

function openPrivacyModal() {
  if (!privacyModal) return;

  fillPrivacyModal();
  privacyModal.hidden = false;
}

function closePrivacyModal() {
  if (!privacyModal) return;

  privacyModal.hidden = true;
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

  if (!currentUser) return;

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
  }
});

/* ===============================
   SHARE
================================ */

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
    } else {
      await navigator.clipboard.writeText(url);
      showToast("Link do perfil copiado!");
    }
  } catch (error) {
    console.warn(error);
  }
});

/* ===============================
   DELETE ACCOUNT
================================ */

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

    showToast("Erro ao excluir. Faça login novamente e tente de novo.");
  }
});
