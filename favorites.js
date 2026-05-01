import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const favoritesGrid = document.getElementById("favoritesGrid");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await loadFavorites(user.uid);
});

async function loadFavorites(uid) {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    const hiddenArtists = userSnap.exists()
      ? userSnap.data().hiddenArtists || []
      : [];

    const favRef = collection(db, "users", uid, "favorites");
    const favQuery = query(favRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(favQuery);

    favoritesGrid.innerHTML = "";

    const favorites = snapshot.docs
      .map((docItem) => ({
        docId: docItem.id,
        ...docItem.data()
      }))
      .filter((item) => !isHiddenArtistFavorite(item, hiddenArtists));

    if (!favorites.length) {
      favoritesGrid.innerHTML = `
        <p class="message">Voce ainda nao favoritou nada.</p>
      `;
      return;
    }

    favorites.forEach((item) => {
      const card = document.createElement("article");
      card.classList.add("favorite-card");

      card.innerHTML = `
        <img src="${escapeAttribute(item.image || "")}" alt="${escapeAttribute(item.title || "Favorito")}">

        <div class="favorite-card-content">
          <span>${escapeHtml(item.type || "Favorito")}</span>
          <h3>${escapeHtml(item.title || "Sem titulo")}</h3>
          <p>${escapeHtml(item.subtitle || "")}</p>

          <button class="remove-favorite-btn" type="button">
            Remover dos favoritos
          </button>
        </div>
      `;

      card.addEventListener("click", () => {
        if (item.spotifyType && item.id) {
          window.location.href = `details.html?type=${encodeURIComponent(item.spotifyType)}&id=${encodeURIComponent(item.id)}`;
        }
      });

      const removeBtn = card.querySelector(".remove-favorite-btn");

      removeBtn.addEventListener("click", async (event) => {
        event.stopPropagation();

        await deleteDoc(doc(db, "users", uid, "favorites", item.docId));
        card.remove();

        if (!favoritesGrid.querySelector(".favorite-card")) {
          favoritesGrid.innerHTML = `
            <p class="message">Voce ainda nao favoritou nada.</p>
          `;
        }
      });

      favoritesGrid.appendChild(card);
    });
  } catch (error) {
    console.error(error);

    favoritesGrid.innerHTML = `
      <p class="message">Nao foi possivel carregar seus favoritos.</p>
    `;
  }
}

function isHiddenArtistFavorite(item, hiddenArtists) {
  if (item.spotifyType !== "artist") return false;

  const artistKey = getArtistKey(item);

  if (!artistKey) return false;

  return hiddenArtists.some((artist) => getArtistKey(artist) === artistKey);
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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text || "";
  return div.innerHTML;
}

function escapeAttribute(text) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
