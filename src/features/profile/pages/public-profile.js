import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const publicBanner = document.getElementById("publicBanner");
const publicAvatar = document.getElementById("publicAvatar");
const publicName = document.getElementById("publicName");
const publicHandle = document.getElementById("publicHandle");
const publicBio = document.getElementById("publicBio");

const publicGenres = document.getElementById("publicGenres");
const publicArtists = document.getElementById("publicArtists");
const tasteSummary = document.getElementById("tasteSummary");

const followBtn = document.getElementById("followBtn");
const messageBtn = document.getElementById("messageBtn");
const compatibilityLink = document.getElementById("compatibilityLink");

const followersCount = document.getElementById("followersCount");
const followingCount = document.getElementById("followingCount");
const postsCount = document.getElementById("postsCount");
const favoritesCount = document.getElementById("favoritesCount");
const reviewsCount = document.getElementById("reviewsCount");

const compatibilityScore = document.getElementById("compatibilityScore");
const compatibilityCircle = document.getElementById("compatibilityCircle");
const compatibilityText = document.getElementById("compatibilityText");

const userPosts = document.getElementById("userPosts");
const userReviews = document.getElementById("userReviews");
const userFavorites = document.getElementById("userFavorites");
const privateProfileNotice = document.getElementById("privateProfileNotice");
const publicStatsSection = document.querySelector(".public-stats");
const profileOverview = document.querySelector(".profile-overview");
const profileTabs = document.querySelector(".profile-tabs");

const tabs = document.querySelectorAll(".profile-tab");
const panels = document.querySelectorAll(".tab-panel");

let currentUser = null;
let viewedUserId = null;
let viewedUserData = null;

const params = new URLSearchParams(window.location.search);
viewedUserId = params.get("user");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  currentUser = user;

  if (!viewedUserId) {
    window.location.href = "/social";
    return;
  }

  if (viewedUserId === currentUser.uid) {
    window.location.href = "/profile";
    return;
  }

  await loadProfile();
});

async function loadProfile() {
  try {
    const viewedSnap = await getDoc(doc(db, "users", viewedUserId));

    if (!viewedSnap.exists()) {
      publicName.textContent = "Perfil não encontrado";
      publicBio.textContent = "Este usuário não existe ou foi removido.";
      return;
    }

    viewedUserData = viewedSnap.data();

    renderProfile();

    if (isPrivateProfile()) {
      renderPrivateProfileState();
      await checkFollowStatus();
      return;
    }

    await Promise.all([
      loadStats(),
      loadCompatibility(),
      loadPosts(),
      loadReviews(),
      loadFavorites(),
      checkFollowStatus()
    ]);
  } catch (error) {
    console.error(error);
    publicBio.textContent = "Não foi possível carregar este perfil.";
  }
}

function renderProfile() {
  const displayName =
    viewedUserData.username ||
    viewedUserData.displayName ||
    "Usuário Vinyl";

  const avatar =
    viewedUserData.photoURL ||
    getFallbackAvatar(displayName);

  publicAvatar.src = avatar;
  publicAvatar.alt = displayName;

  publicName.textContent = displayName;
  publicHandle.textContent = `@${String(displayName).replace(/\s+/g, "").toLowerCase()}`;

  publicBio.textContent =
    isPrivateProfile()
      ? "Este perfil esta privado."
      : viewedUserData.bio || "Sem bio ainda.";

  if (publicBanner) {
    const visibleArtists = isPrivateProfile()
      ? []
      : getVisibleArtists(
          viewedUserData.favoriteArtists || [],
          viewedUserData.hiddenArtists || []
        );
    const favoriteArtist = normalizeArtists(visibleArtists)[0];
    const favoriteGenre = viewedUserData.favoriteGenres?.[0] || "music";
    publicBanner.style.backgroundImage = `
      linear-gradient(135deg, rgba(255,77,109,.45), rgba(29,185,84,.13)),
      url("https://source.unsplash.com/1600x600/?${encodeURIComponent(favoriteArtist || favoriteGenre)},concert")
    `;
  }

  if (!isPrivateProfile()) {
    renderTags(publicGenres, viewedUserData.favoriteGenres || []);
    renderTags(publicArtists, normalizeArtists(getVisibleArtists(
      viewedUserData.favoriteArtists || [],
      viewedUserData.hiddenArtists || []
    )));
    renderTasteSummary();
  } else {
    renderTags(publicGenres, []);
    renderTags(publicArtists, []);
  }

  compatibilityLink.href = `/compatibility?user=${encodeURIComponent(viewedUserId)}`;
}

function renderPrivateProfileState() {
  privateProfileNotice.hidden = false;
  publicStatsSection.classList.add("private-hidden");
  profileOverview.classList.add("private-hidden");
  profileTabs.classList.add("private-hidden");
  panels.forEach((panel) => panel.classList.add("private-hidden"));

  compatibilityLink.classList.add("private-hidden");
}

function isPrivateProfile() {
  return Boolean(viewedUserData?.privacy?.privateProfile);
}

function renderTags(container, list) {
  container.innerHTML = "";

  const items = list.filter(Boolean).slice(0, 8);

  if (!items.length) return;

  items.forEach((item) => {
    const tag = document.createElement("span");
    tag.textContent = item;
    container.appendChild(tag);
  });
}

function renderTasteSummary() {
  const genres = viewedUserData.favoriteGenres || [];
  const artists = normalizeArtists(getVisibleArtists(
    viewedUserData.favoriteArtists || [],
    viewedUserData.hiddenArtists || []
  ));
  const goals = viewedUserData.appGoals || [];

  tasteSummary.innerHTML = `
    <div class="taste-row">
      <span>Gêneros favoritos</span>
      <strong>${escapeHtml(genres.slice(0, 3).join(", ") || "Não informado")}</strong>
    </div>
    <div class="taste-row">
      <span>Artistas favoritos</span>
      <strong>${escapeHtml(artists.slice(0, 3).join(", ") || "Não informado")}</strong>
    </div>
    <div class="taste-row">
      <span>Objetivo no Vinyl</span>
      <strong>${escapeHtml(goals.slice(0, 2).join(", ") || "Explorar música")}</strong>
    </div>
  `;
}

async function loadStats() {
  const [
    followersSnap,
    followingSnap,
    postsSnap,
    favoritesSnap,
    reviewsSnap
  ] = await Promise.all([
    getDocs(collection(db, "users", viewedUserId, "followers")),
    getDocs(collection(db, "users", viewedUserId, "following")),
    getDocs(query(collection(db, "posts"), where("userId", "==", viewedUserId))),
    getDocs(collection(db, "users", viewedUserId, "favorites")),
    getDocs(collection(db, "users", viewedUserId, "reviews"))
  ]);

  followersCount.textContent = followersSnap.size;
  followingCount.textContent = followingSnap.size;
  postsCount.textContent = postsSnap.size;
  favoritesCount.textContent = favoritesSnap.size;
  reviewsCount.textContent = reviewsSnap.size;
}

async function loadCompatibility() {
  const currentSnap = await getDoc(doc(db, "users", currentUser.uid));

  if (!currentSnap.exists()) return;

  const currentData = currentSnap.data();

  const myGenres = normalizeArray(currentData.favoriteGenres || []);
  const otherGenres = normalizeArray(viewedUserData.favoriteGenres || []);

  const myArtists = normalizeArray(normalizeArtists(getVisibleArtists(
    currentData.favoriteArtists || [],
    currentData.hiddenArtists || []
  )));
  const otherArtists = normalizeArray(normalizeArtists(getVisibleArtists(
    viewedUserData.favoriteArtists || [],
    viewedUserData.hiddenArtists || []
  )));

  const sharedGenres = myGenres.filter((genre) => otherGenres.includes(genre));
  const sharedArtists = myArtists.filter((artist) => otherArtists.includes(artist));

  const maxSignals = Math.max(
    new Set([...myGenres, ...otherGenres, ...myArtists, ...otherArtists]).size,
    1
  );

  const score = Math.min(
    100,
    Math.round(((sharedGenres.length * 1.2 + sharedArtists.length * 1.8) / maxSignals) * 100)
  );

  compatibilityScore.textContent = `${score}%`;
  compatibilityCircle.textContent = `${score}%`;

  if (score > 75) {
    compatibilityText.textContent = "Vocês têm gostos muito próximos. Dá para confiar nas recomendações desse perfil.";
  } else if (score > 45) {
    compatibilityText.textContent = "Existe uma boa ponte musical entre vocês, com alguns artistas ou gêneros em comum.";
  } else if (score > 0) {
    compatibilityText.textContent = "Vocês se cruzam em alguns pontos, mas esse perfil pode abrir caminhos novos.";
  } else {
    compatibilityText.textContent = "Vocês têm gostos bem diferentes. Ótimo para descobrir algo fora da bolha.";
  }
}

async function checkFollowStatus() {
  const followDoc = await getDoc(
    doc(db, "users", currentUser.uid, "following", viewedUserId)
  );

  followBtn.dataset.following = followDoc.exists() ? "true" : "false";
  followBtn.textContent = followDoc.exists() ? "Seguindo" : "Seguir";
}

followBtn?.addEventListener("click", async () => {
  const following = followBtn.dataset.following === "true";

  try {
    followBtn.disabled = true;

    if (!following) {
      await setDoc(
        doc(db, "users", currentUser.uid, "following", viewedUserId),
        { createdAt: serverTimestamp() }
      );

      await setDoc(
        doc(db, "users", viewedUserId, "followers", currentUser.uid),
        { createdAt: serverTimestamp() }
      );

      followBtn.textContent = "Seguindo";
      followBtn.dataset.following = "true";
    } else {
      await deleteDoc(
        doc(db, "users", currentUser.uid, "following", viewedUserId)
      );

      await deleteDoc(
        doc(db, "users", viewedUserId, "followers", currentUser.uid)
      );

      followBtn.textContent = "Seguir";
      followBtn.dataset.following = "false";
    }

    await loadStats();
  } catch (error) {
    console.error("Erro ao seguir:", error);
    alert("Não foi possível atualizar o follow.");
  } finally {
    followBtn.disabled = false;
  }
});

messageBtn?.addEventListener("click", () => {
  window.location.href = `/chat?user=${encodeURIComponent(viewedUserId)}`;
});

async function loadPosts() {
  const snapshot = await getDocs(
    query(
      collection(db, "posts"),
      where("userId", "==", viewedUserId)
    )
  );

  userPosts.innerHTML = "";

  if (snapshot.empty) {
    userPosts.innerHTML = `<p class="message">Nenhum post ainda.</p>`;
    return;
  }

  snapshot.docs
    .map((docItem) => docItem.data())
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .forEach((post) => {
    const card = document.createElement("article");
    card.className = "profile-card";

    card.innerHTML = `
      <div class="profile-card-top">
        <span>${formatDate(post.createdAt)}</span>
        <span>${(post.likes?.length || post.likesCount || 0)} curtidas</span>
      </div>

      <h3>${escapeHtml(post.text || "Post com mídia")}</h3>
      ${renderPostMedia(post)}
      ${renderSpotifyLink(post.spotifyUrl)}
    `;

    userPosts.appendChild(card);
    });
}

async function loadReviews() {
  const snapshot = await getDocs(
    collection(db, "users", viewedUserId, "reviews")
  );

  userReviews.innerHTML = "";

  if (snapshot.empty) {
    userReviews.innerHTML = `<p class="message">Nenhuma review ainda.</p>`;
    return;
  }

  snapshot.forEach((docItem) => {
    const review = docItem.data();
    const card = document.createElement("article");
    card.className = "profile-card";

    card.innerHTML = `
      <div class="profile-card-top">
        <span>Review</span>
        <span>${review.rating ? `${escapeHtml(String(review.rating))}/5` : ""}</span>
      </div>
      <h3>${escapeHtml(review.album || review.title || "Review")}</h3>
      <p>${escapeHtml(review.text || review.content || "")}</p>
    `;

    userReviews.appendChild(card);
  });
}

async function loadFavorites() {
  const snapshot = await getDocs(
    collection(db, "users", viewedUserId, "favorites")
  );

  userFavorites.innerHTML = "";

  if (snapshot.empty) {
    userFavorites.innerHTML = `<p class="message">Nenhum favorito ainda.</p>`;
    return;
  }

  snapshot.forEach((docItem) => {
    const fav = docItem.data();
    const card = document.createElement("article");
    card.className = "profile-card favorite-profile-card";

    const title = fav.title || fav.name || "Favorito";
    const image = fav.image || getFallbackCover(title);

    card.innerHTML = `
      <img src="${escapeAttribute(image)}" alt="${escapeAttribute(title)}">
      <div class="profile-card-body">
        <span>${escapeHtml(fav.type || fav.spotifyType || "Favorito")}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(fav.subtitle || fav.artist || "")}</p>
      </div>
    `;

    card.addEventListener("click", () => {
      if (fav.spotifyType && fav.id) {
        window.location.href = `/details?type=${encodeURIComponent(fav.spotifyType)}&id=${encodeURIComponent(fav.id)}`;
      }
    });

    userFavorites.appendChild(card);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((btn) => btn.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));

    tab.classList.add("active");

    const panel = document.getElementById(`${tab.dataset.tab}Panel`);
    panel.classList.add("active");
  });
});

function renderPostMedia(post) {
  if (post.imageUrl) {
    return `
      <div class="profile-media">
        <img src="${escapeAttribute(post.imageUrl)}" alt="Imagem do post">
      </div>
    `;
  }

  if (post.videoUrl) {
    return `
      <div class="profile-media">
        <video controls>
          <source src="${escapeAttribute(post.videoUrl)}">
        </video>
      </div>
    `;
  }

  return "";
}

function renderSpotifyLink(url) {
  if (!url) return "";

  return `
    <p>
      <a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">
        Abrir no Spotify
      </a>
    </p>
  `;
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

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "Agora";

  return timestamp.toDate().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  });
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

function getFallbackCover(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=171717&color=ff4d6d&size=512`;
}
