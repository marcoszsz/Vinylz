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

const DEFAULT_AVATAR = "https://placehold.co/240x240/111111/ff4d6d?text=V";

let currentUser = null;
let currentUserData = {};
let currentInsights = null;

const toast = document.getElementById("toast");

document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
  document.getElementById("navbarLinks")?.classList.toggle("open");
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

document.getElementById("shareInsightBtn")?.addEventListener("click", shareInsight);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  await loadInsights();
});

async function loadInsights() {
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  currentUserData = userSnap.exists() ? userSnap.data() : {};

  renderProfile();

  const [posts, reviews, favorites, stories] = await Promise.all([
    loadUserDocs("posts"),
    loadUserDocs("reviews"),
    loadFavorites(),
    loadUserDocs("stories")
  ]);

  currentInsights = buildInsights({ posts, reviews, favorites, stories });
  renderInsights(currentInsights);
}

async function loadUserDocs(collectionName) {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, collectionName),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(80)
      )
    );

    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch {
    return [];
  }
}

async function loadFavorites() {
  try {
    const snapshot = await getDocs(collection(db, "users", currentUser.uid, "favorites"));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch {
    return [];
  }
}

function buildInsights({ posts, reviews, favorites, stories }) {
  const terms = new Map();
  const genres = new Map();

  [
    ...(currentUserData.favoriteGenres || []),
    currentUserData.topGenre
  ].filter(Boolean).forEach((genre) => increment(genres, getName(genre), 3));

  [...favorites, ...reviews, ...posts].forEach((item) => {
    [
      item.title,
      item.name,
      item.artist,
      item.album,
      item.itemTitle,
      item.music?.title,
      item.music?.artist
    ].filter(Boolean).forEach((term) => increment(terms, term, 1));

    [
      item.genre,
      item.topGenre,
      item.music?.genre
    ].filter(Boolean).forEach((genre) => increment(genres, genre, 2));
  });

  const ranking = toRanking(terms).slice(0, 6);
  const genreRanking = toRanking(genres).slice(0, 5);
  const activity = posts.length + reviews.length + favorites.length + stories.length;
  const dominantGenre = genreRanking[0]?.name || currentUserData.topGenre || "Descoberta";
  const dominantVibe = activity >= 30
    ? "Curador ativo"
    : activity >= 12
      ? "Explorador consistente"
      : "Descoberta";

  return {
    posts,
    reviews,
    favorites,
    stories,
    ranking,
    genreRanking,
    dominantGenre,
    dominantVibe,
    activity
  };
}

function renderProfile() {
  const username = currentUserData.username || currentUser.email?.split("@")[0] || "usuario";
  const displayName = currentUserData.displayName || currentUser.displayName || username;
  const avatar = currentUserData.photoURL || currentUser.photoURL || DEFAULT_AVATAR;

  setText("navbarUsername", username);
  setText("displayName", displayName);
  setText("profileUsername", `@${username}`);
  setImage("navbarAvatar", avatar);
  setImage("profileAvatar", avatar);
}

function renderInsights(data) {
  setText("postsCount", data.posts.length);
  setText("reviewsCount", data.reviews.length);
  setText("favoritesCount", data.favorites.length);
  setText("storiesCount", data.stories.length);
  setText("dominantVibe", data.dominantVibe);
  setText("identitySubtitle", `${data.dominantGenre} aparece como principal sinal do seu perfil.`);
  setText(
    "dominantVibeText",
    data.activity
      ? `Seu painel usa ${data.activity} sinais entre posts, reviews, favoritos e stories.`
      : "Comece com favoritos, reviews e posts para formar um painel mais preciso."
  );
  setText(
    "summaryText",
    data.activity
      ? `Seu Vinyl esta em modo ${data.dominantVibe.toLowerCase()}, com ${data.favorites.length} favoritos e ${data.reviews.length} reviews.`
      : "Adicione favoritos, reviews e posts para transformar seu gosto em um painel vivo."
  );

  renderGenreBars(data.genreRanking);
  renderRanking(data.ranking);
  renderActions(data);
}

function renderGenreBars(genres) {
  const list = document.getElementById("genreBars");
  if (!list) return;

  if (!genres.length) {
    list.innerHTML = `<p class="empty-state">Nenhum genero identificado ainda.</p>`;
    return;
  }

  const max = Math.max(...genres.map((item) => item.count), 1);

  list.innerHTML = genres.map((item) => {
    const width = Math.max(12, Math.round((item.count / max) * 100));

    return `
      <div class="bar-row">
        <header>
          <span>${escapeHTML(item.name)}</span>
          <span>${item.count}</span>
        </header>
        <div class="bar-track">
          <span class="bar-fill" style="width:${width}%"></span>
        </div>
      </div>
    `;
  }).join("");
}

function renderRanking(items) {
  const list = document.getElementById("rankingList");
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<p class="empty-state">Nenhum item recorrente ainda.</p>`;
    return;
  }

  list.innerHTML = items.slice(0, 3).map((item, index) => `
    <article class="ranking-item">
      <span>#${index + 1}</span>
      <strong>${escapeHTML(item.name)}</strong>
      <small>${item.count} sinais no seu Vinyl</small>
    </article>
  `).join("");
}

function renderActions(data) {
  const actions = [
    {
      title: "Criar uma colecao",
      text: data.favorites.length
        ? "Agrupe seus favoritos em uma prateleira tematica."
        : "Monte uma colecao inicial com artistas, albuns e faixas."
    },
    {
      title: "Publicar uma review",
      text: data.reviews.length
        ? "Escolha um favorito recente e transforme em review."
        : "Sua primeira review ajuda o Vinyl a entender melhor seu gosto."
    },
    {
      title: "Atualizar o perfil",
      text: data.dominantGenre
        ? `Use ${data.dominantGenre} como genero dominante no perfil.`
        : "Adicione genero dominante, album favorito e musica do momento."
    }
  ];

  const list = document.getElementById("actionList");
  if (!list) return;

  list.innerHTML = actions.map((item) => `
    <li>
      <strong>${escapeHTML(item.title)}</strong>
      <p>${escapeHTML(item.text)}</p>
    </li>
  `).join("");
}

async function shareInsight() {
  if (!currentInsights || !currentUser) return;

  const username = currentUserData.username || currentUser.email?.split("@")[0] || "usuario";
  const content = `Meu Vinyl esta em modo ${currentInsights.dominantVibe}. Genero em destaque: ${currentInsights.dominantGenre}.`;

  await addDoc(collection(db, "posts"), {
    userId: currentUser.uid,
    userName: currentUserData.displayName || username,
    userUsername: username,
    userAvatar: currentUserData.photoURL || DEFAULT_AVATAR,
    content,
    type: "insight",
    likesCount: 0,
    repliesCount: 0,
    repostsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  showToast("Resumo postado.");
}

function increment(map, rawName, amount = 1) {
  const name = getName(rawName);
  if (!name) return;

  const key = name.toLowerCase();
  const current = map.get(key) || { name, count: 0 };
  current.count += amount;
  map.set(key, current);
}

function getName(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.name || value.title || "").trim();
}

function toRanking(map) {
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value ?? "");
}

function setImage(id, value) {
  const element = document.getElementById(id);
  if (element) element.src = value || DEFAULT_AVATAR;
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
  setTimeout(() => toast.classList.remove("show"), 2600);
}
