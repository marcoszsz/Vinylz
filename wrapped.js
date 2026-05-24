import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DEFAULT_AVATAR = "https://placehold.co/200x200/111111/ff4d6d?text=V";
const DEFAULT_COVER = "https://placehold.co/500x500/111111/ff4d6d?text=VINYL";

let currentUser = null;
let currentUserData = {};
let wrappedData = null;
let currentSlide = 0;

const slides = Array.from(document.querySelectorAll(".wrapped-slide"));
const toast = document.getElementById("toast");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  await loadWrapped();
});

document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
  document.getElementById("navbarLinks")?.classList.toggle("open");
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

document.getElementById("startWrappedBtn")?.addEventListener("click", () => showPlayer());
document.getElementById("exitWrappedBtn")?.addEventListener("click", () => showIntro());
document.getElementById("prevSlideBtn")?.addEventListener("click", () => setSlide(currentSlide - 1));
document.getElementById("nextSlideBtn")?.addEventListener("click", () => setSlide(currentSlide + 1));
document.getElementById("postWrappedBtn")?.addEventListener("click", postWrapped);
document.getElementById("downloadWrappedBtn")?.addEventListener("click", downloadWrappedImage);
document.getElementById("copyWrappedBtn")?.addEventListener("click", async () => {
  await navigator.clipboard?.writeText(window.location.href);
  showToast("Link copiado.");
});

async function loadWrapped() {
  showSection("wrappedLoading");

  try {
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    currentUserData = userSnap.exists() ? userSnap.data() : {};

    renderUser();

    const [posts, reviews, favorites, stories] = await Promise.all([
      loadByUser("posts"),
      loadByUser("reviews"),
      loadFavorites(),
      loadByUser("stories")
    ]);

    wrappedData = buildWrapped({ posts, reviews, favorites, stories });

    if (!wrappedData.hasData) {
      showSection("wrappedEmpty");
      return;
    }

    renderWrapped();
    showIntro();
  } catch (error) {
    console.error("Erro ao carregar Wrapped:", error);
    showSection("wrappedEmpty");
  }
}

async function loadByUser(collectionName) {
  const snap = await getDocs(
    query(
      collection(db, collectionName),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(80)
    )
  );

  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function loadFavorites() {
  const snap = await getDocs(collection(db, "users", currentUser.uid, "favorites"));

  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function buildWrapped({ posts, reviews, favorites, stories }) {
  const names = new Map();

  [...favorites, ...reviews, ...posts].forEach((item) => {
    const title =
      item.title ||
      item.name ||
      item.artist ||
      item.album ||
      item.itemTitle ||
      item.music?.title ||
      "";

    if (!title) return;

    const key = title.toLowerCase();
    const current = names.get(key) || {
      title,
      image: item.image || item.cover || item.music?.image || DEFAULT_COVER,
      subtitle: item.artist || item.subtitle || "Vinyl",
      count: 0
    };

    current.count += 1;
    names.set(key, current);
  });

  const ranking = Array.from(names.values()).sort((a, b) => b.count - a.count);
  const topItem = ranking[0] || {
    title: "Sua biblioteca",
    image: DEFAULT_COVER,
    subtitle: "Continue explorando",
    count: 0
  };
  const activityCount = posts.length + reviews.length + favorites.length + stories.length;
  const vibe = activityCount > 15 ? "Colecionador intenso" : activityCount > 5 ? "Explorador musical" : "Descoberta em andamento";

  return {
    hasData: activityCount > 0,
    posts,
    reviews,
    favorites,
    stories,
    ranking,
    topItem,
    vibe,
    likes: sum(posts, "likesCount"),
    replies: sum(posts, "repliesCount"),
    reposts: sum(posts, "repostsCount")
  };
}

function renderUser() {
  const username = currentUserData.username || currentUser.email?.split("@")[0] || "usuario";
  const displayName = currentUserData.displayName || username || "Usuario Vinyl";
  const avatar = currentUserData.photoURL || currentUserData.avatar || currentUser.photoURL || DEFAULT_AVATAR;

  setText("navbarUsername", username);
  setText("introName", displayName);
  setText("introUsername", `@${username}`);
  setText("shareUsername", `@${username}`);
  setImage("navbarAvatar", avatar);
  setImage("introAvatar", avatar);
  setImage("shareAvatar", avatar);
}

function renderWrapped() {
  setText("wrappedYear", new Date().getFullYear());
  setText("postsCount", wrappedData.posts.length);
  setText("reviewsCount", wrappedData.reviews.length);
  setText("favoritesCount", wrappedData.favorites.length);
  setText("storiesCount", wrappedData.stories.length);
  setText("topArtistName", wrappedData.topItem.title);
  setText("topArtistTitle", wrappedData.topItem.title);
  setText("topArtistCount", wrappedData.topItem.count);
  setImage("topArtistImage", wrappedData.topItem.image || DEFAULT_COVER);
  setText("topAlbumName", wrappedData.topItem.title);
  setText("topAlbumSubtitle", wrappedData.topItem.subtitle || "Vinyl");
  setImage("topAlbumImage", wrappedData.topItem.image || DEFAULT_COVER);
  setText("vibeTitle", wrappedData.vibe);
  setText("vibePhrase", "Seu resumo foi montado com posts, favoritos, reviews e stories.");
  setText("likesReceivedCount", wrappedData.likes);
  setText("repliesReceivedCount", wrappedData.replies);
  setText("repostsReceivedCount", wrappedData.reposts);
  setText("shareVibe", wrappedData.vibe);
  setText("sharePosts", wrappedData.posts.length);
  setText("shareFavorites", wrappedData.favorites.length);
  setText("shareTopArtist", wrappedData.topItem.title);
  renderRanking();
  setSlide(0);
}

function renderRanking() {
  const ranking = document.getElementById("topRanking");
  if (!ranking) return;

  ranking.replaceChildren(
    ...wrappedData.ranking.slice(0, 5).map((item, index) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${index + 1}</span><strong></strong><small>${item.count} interacoes</small>`;
      li.querySelector("strong").textContent = item.title;
      return li;
    })
  );
}

function showIntro() {
  showSection("wrappedIntro");
}

function showPlayer() {
  showSection("wrappedPlayer");
  setSlide(0);
}

function showSection(id) {
  ["wrappedLoading", "wrappedEmpty", "wrappedIntro", "wrappedPlayer"].forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) section.hidden = sectionId !== id;
  });
}

function setSlide(index) {
  currentSlide = Math.max(0, Math.min(index, slides.length - 1));
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === currentSlide);
  });

  setText("slideCounter", `${currentSlide + 1}/${slides.length}`);

  const progress = document.getElementById("wrappedProgressBar");
  if (progress) progress.style.width = `${((currentSlide + 1) / slides.length) * 100}%`;

  const prev = document.getElementById("prevSlideBtn");
  const next = document.getElementById("nextSlideBtn");
  if (prev) prev.disabled = currentSlide === 0;
  if (next) next.disabled = currentSlide === slides.length - 1;
}

async function postWrapped() {
  if (!wrappedData) return;

  const username = currentUserData.username || currentUser.email?.split("@")[0] || "usuario";

  await addDoc(collection(db, "posts"), {
    userId: currentUser.uid,
    userName: currentUserData.displayName || username,
    userUsername: username,
    userAvatar: currentUserData.photoURL || currentUserData.avatar || DEFAULT_AVATAR,
    content: `Meu Vinyl Wrapped: ${wrappedData.vibe}. Destaque: ${wrappedData.topItem.title}.`,
    type: "wrapped",
    likesCount: 0,
    repliesCount: 0,
    repostsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  showToast("Wrapped postado.");
}

function downloadWrappedImage() {
  if (!wrappedData) return;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 1080;
  canvas.height = 1080;

  context.fillStyle = "#0b0b0d";
  context.fillRect(0, 0, 1080, 1080);
  context.fillStyle = "#ff4d6d";
  context.fillRect(0, 0, 1080, 14);
  context.fillStyle = "#fff";
  context.font = "700 72px Arial";
  context.fillText("VINYL WRAPPED", 80, 150);
  context.font = "700 52px Arial";
  context.fillText(wrappedData.vibe.slice(0, 30), 80, 300);
  context.font = "400 34px Arial";
  context.fillText(`Destaque: ${wrappedData.topItem.title}`.slice(0, 44), 80, 410);
  context.fillText(`Posts: ${wrappedData.posts.length}`, 80, 500);
  context.fillText(`Favoritos: ${wrappedData.favorites.length}`, 80, 560);
  context.fillText(`Reviews: ${wrappedData.reviews.length}`, 80, 620);

  const link = document.createElement("a");
  link.download = "vinyl-wrapped.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value ?? "");
}

function setImage(id, value) {
  const element = document.getElementById(id);
  if (element) element.src = value || DEFAULT_AVATAR;
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}
