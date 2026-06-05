import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const reviewContent = document.getElementById("reviewContent");

const params = new URLSearchParams(window.location.search);
const type = params.get("type");
const id = params.get("id");

let currentUser = null;
let selectedRating = 0;
let currentItem = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  if (!type || !id) {
    renderMissingItem();
    return;
  }

  await loadItem();
});

async function loadItem() {
  try {
    const response = await fetch(`/api/spotifyDetails?type=${type}&id=${id}`);

    if (!response.ok) {
      throw new Error(`Spotify details: ${response.status}`);
    }

    const data = await response.json();

    currentItem = data;
    renderReview(data);
  } catch (error) {
    reviewContent.innerHTML = `
      <p class="message">Não foi possível carregar.</p>
    `;
  }
}

function renderMissingItem() {
  reviewContent.innerHTML = `
    <div class="review-card">
      <div class="review-info">
        <span class="tag">Review</span>
        <h1>Escolha uma musica, album ou artista</h1>
        <p>Para escrever uma avaliacao, abra um item pelo catalogo e clique em publicar review.</p>

        <div class="review-box">
          <a class="save-btn" href="search.html">
            Ir para o catalogo
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderReview(data) {
  const image =
    data.images?.[0]?.url ||
    data.album?.images?.[0]?.url ||
    "";

  const title = data.name;

  const subtitle =
    data.artists?.map((artist) => artist.name).join(", ") ||
    data.owner?.display_name ||
    "";

  reviewContent.innerHTML = `
    <div class="review-card">
      <img src="${image}" class="review-cover" alt="${title}">

      <div class="review-info">
        <span class="tag">${formatType(type)}</span>
        <h1>${title}</h1>
        <p>${subtitle}</p>

        <div class="review-box">
          <div class="rating">
            <span class="star" data-rating="1">★</span>
            <span class="star" data-rating="2">★</span>
            <span class="star" data-rating="3">★</span>
            <span class="star" data-rating="4">★</span>
            <span class="star" data-rating="5">★</span>
          </div>

          <textarea
            id="reviewText"
            placeholder="Escreva sua review..."
          ></textarea>

          <button class="save-btn" id="saveReview">
            Publicar Review
          </button>
        </div>
      </div>
    </div>
  `;

  setupRating();
  setupSave();
}

function setupRating() {
  const stars = document.querySelectorAll(".star");

  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = Number(star.dataset.rating);

      stars.forEach((item) => {
        item.classList.toggle(
          "active",
          Number(item.dataset.rating) <= selectedRating
        );
      });
    });
  });
}

function setupSave() {
  const saveBtn = document.getElementById("saveReview");

  saveBtn.addEventListener("click", async () => {
    const reviewText = document.getElementById("reviewText").value.trim();

    if (!reviewText || selectedRating === 0) {
      alert("Adicione nota e review.");
      return;
    }

    const image =
      currentItem.images?.[0]?.url ||
      currentItem.album?.images?.[0]?.url ||
      "";

    const title = currentItem.name;

    const publicReview = {
      userId: currentUser.uid,
      userName: currentUser.displayName || "Usuário Vinyl",
      userPhoto: currentUser.photoURL || "",
      spotifyId: id,
      spotifyType: type,
      title,
      image,
      rating: selectedRating,
      review: reviewText,
      createdAt: serverTimestamp()
    };

    try {
      const publicReviewRef = await addDoc(
        collection(db, "reviews"),
        publicReview
      );

      await setDoc(
        doc(db, "users", currentUser.uid, "reviews", publicReviewRef.id),
        {
          ...publicReview,
          publicReviewId: publicReviewRef.id
        }
      );

      await addDoc(collection(db, "feed"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Usuário Vinyl",
        userPhoto: currentUser.photoURL || "",
        action: "review",
        targetTitle: title,
        targetImage: image,
        targetType: type,
        rating: selectedRating,
        reviewId: publicReviewRef.id,
        createdAt: serverTimestamp()
      });

      alert("Review publicada!");
      window.location.href = `details.html?type=${type}&id=${id}`;
    } catch (error) {
      console.error(error);
      alert("Erro ao publicar review.");
    }
  });
}

function formatType(type) {
  const types = {
    artist: "Artista",
    album: "Álbum",
    track: "Música",
    playlist: "Playlist"
  };

  return types[type] || "Item";
}
