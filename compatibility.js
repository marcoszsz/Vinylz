import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const targetUserId = params.get("user");

const comparisonText = document.getElementById("comparisonText");
const compatibilityScore = document.getElementById("compatibilityScore");
const scoreCircle = document.querySelector(".score-circle");
const scoreLabel = document.getElementById("scoreLabel");

const commonArtistsEl = document.getElementById("commonArtists");
const commonFavoritesEl = document.getElementById("commonFavorites");
const commonGenresEl = document.getElementById("commonGenres");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  if (!targetUserId) {
    document.querySelector(".compatibility-page").innerHTML = `
      <p class="message">Usuário não encontrado.</p>
    `;
    return;
  }

  if (currentUser.uid === targetUserId) {
    document.querySelector(".compatibility-page").innerHTML = `
      <p class="message">Você não pode comparar compatibilidade consigo mesmo.</p>
    `;
    return;
  }

  await loadCompatibility();
});

async function loadCompatibility() {
  const myUser = await getUserData(currentUser.uid);
  const targetUser = await getUserData(targetUserId);

  comparisonText.textContent = `${myUser.displayName || "Você"} + ${
    targetUser.displayName || "Usuário Vinyl"
  }`;

  const myFavorites = await getFavorites(currentUser.uid);
  const targetFavorites = await getFavorites(targetUserId);

  const commonFavorites = getCommonById(myFavorites, targetFavorites);

  const myArtists = getVisibleArtists(
    myUser.favoriteArtists || [],
    myUser.hiddenArtists || []
  );
  const targetArtists = getVisibleArtists(
    targetUser.favoriteArtists || [],
    targetUser.hiddenArtists || []
  );

  const commonArtists = getCommonById(myArtists, targetArtists);

  const myGenres = extractGenres(myArtists);
  const targetGenres = extractGenres(targetArtists);

  const commonGenres = myGenres.filter((genre) =>
    targetGenres.includes(genre)
  );

  const score = calculateScore({
    commonArtists,
    commonFavorites,
    commonGenres,
    myFavorites,
    targetFavorites,
    myArtists,
    targetArtists
  });

  renderScore(score);
  renderCommonArtists(commonArtists);
  renderCommonFavorites(commonFavorites);
  renderCommonGenres(commonGenres);
}

async function getUserData(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return {};

  return userSnap.data();
}

async function getFavorites(uid) {
  const favRef = collection(db, "users", uid, "favorites");
  const snapshot = await getDocs(favRef);

  return snapshot.docs.map((docItem) => docItem.data());
}

function getCommonById(listA, listB) {
  return listA.filter((itemA) =>
    listB.some((itemB) => getArtistKey(itemB) === getArtistKey(itemA))
  );
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

  if (typeof artist === "string") return normalizeText(artist);

  return normalizeText(artist.id || artist.spotifyId || artist.name || artist.title || "");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractGenres(artists) {
  const genres = [];

  artists.forEach((artist) => {
    if (artist.genres) {
      artist.genres.forEach((genre) => {
        if (!genres.includes(genre)) {
          genres.push(genre);
        }
      });
    }
  });

  return genres;
}

function calculateScore(data) {
  const {
    commonArtists,
    commonFavorites,
    commonGenres,
    myFavorites,
    targetFavorites,
    myArtists,
    targetArtists
  } = data;

  let score = 0;

  score += commonArtists.length * 18;
  score += commonFavorites.length * 14;
  score += commonGenres.length * 8;

  const maxBase =
    Math.max(myFavorites.length, targetFavorites.length, 1) +
    Math.max(myArtists.length, targetArtists.length, 1);

  score += Math.min(20, Math.round((commonFavorites.length / maxBase) * 100));

  return Math.min(score, 100);
}

function renderScore(score) {
  compatibilityScore.textContent = `${score}%`;
  scoreCircle.style.setProperty("--score", `${score}%`);

  if (score < 30) {
    scoreLabel.textContent = "Gostos bem diferentes";
  } else if (score < 60) {
    scoreLabel.textContent = "Compatibilidade média";
  } else if (score < 80) {
    scoreLabel.textContent = "Vocês têm gostos parecidos";
  } else {
    scoreLabel.textContent = "Almas musicais gêmeas";
  }
}

function renderCommonArtists(artists) {
  commonArtistsEl.innerHTML = "";

  if (!artists.length) {
    commonArtistsEl.innerHTML = `
      <p class="message">Nenhum artista em comum ainda.</p>
    `;
    return;
  }

  artists.forEach((artist) => {
    const card = document.createElement("article");
    card.classList.add("compat-card");

    card.innerHTML = `
      <img src="${artist.image || ""}" alt="${artist.name}">

      <div class="compat-card-content">
        <span>Artista em comum</span>
        <h3>${artist.name}</h3>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `details.html?type=artist&id=${artist.id}`;
    });

    commonArtistsEl.appendChild(card);
  });
}

function renderCommonFavorites(favorites) {
  commonFavoritesEl.innerHTML = "";

  if (!favorites.length) {
    commonFavoritesEl.innerHTML = `
      <p class="message">Nenhum favorito em comum ainda.</p>
    `;
    return;
  }

  favorites.forEach((item) => {
    const card = document.createElement("article");
    card.classList.add("compat-card");

    card.innerHTML = `
      <img src="${item.image || ""}" alt="${item.title}">

      <div class="compat-card-content">
        <span>${item.type || "Favorito"}</span>
        <h3>${item.title}</h3>
        <p>${item.subtitle || ""}</p>
      </div>
    `;

    card.addEventListener("click", () => {
      if (item.spotifyType && item.id) {
        window.location.href = `details.html?type=${item.spotifyType}&id=${item.id}`;
      }
    });

    commonFavoritesEl.appendChild(card);
  });
}

function renderCommonGenres(genres) {
  commonGenresEl.innerHTML = "";

  if (!genres.length) {
    commonGenresEl.innerHTML = `
      <p class="message">Nenhum gênero parecido encontrado.</p>
    `;
    return;
  }

  genres.forEach((genre) => {
    const pill = document.createElement("span");
    pill.classList.add("genre-pill");
    pill.textContent = genre;

    commonGenresEl.appendChild(pill);
  });
}
