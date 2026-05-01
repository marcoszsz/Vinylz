import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const timelineList = document.getElementById("timelineList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await loadTimeline(user.uid);
});

async function loadTimeline(uid) {
  if (!timelineList) return;

  timelineList.innerHTML = `
    <p class="message">Carregando timeline...</p>
  `;

  try {
    const favorites = await getFavorites(uid);
    const reviews = await getReviews(uid);

    const items = [...favorites, ...reviews].sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;

      return dateB - dateA;
    });

    renderTimeline(items);
  } catch (error) {
    console.error(error);

    timelineList.innerHTML = `
      <p class="message">Não foi possível carregar sua timeline.</p>
    `;
  }
}

async function getFavorites(uid) {
  const favQuery = query(
    collection(db, "users", uid, "favorites"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(favQuery);

  return snapshot.docs.map((docItem) => ({
    timelineType: "favorite",
    docId: docItem.id,
    ...docItem.data()
  }));
}

async function getReviews(uid) {
  const reviewsQuery = query(
    collection(db, "users", uid, "reviews"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(reviewsQuery);

  return snapshot.docs.map((docItem) => ({
    timelineType: "review",
    docId: docItem.id,
    ...docItem.data()
  }));
}

function renderTimeline(items) {
  timelineList.innerHTML = "";

  if (items.length === 0) {
    timelineList.innerHTML = `
      <p class="message">Sua timeline ainda está vazia.</p>
    `;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.classList.add("timeline-card");

    const actionText =
      item.timelineType === "review"
        ? `avaliou com ${item.rating}/5`
        : "favoritou";

    card.innerHTML = `
      <img src="${item.image || ""}" alt="${item.title || ""}">

      <div class="timeline-content">
        <span>${actionText}</span>
        <h3>${item.title || "Sem título"}</h3>
        <p>${item.subtitle || item.review || ""}</p>

        ${
          item.timelineType === "review"
            ? `<div class="stars">${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}</div>`
            : ""
        }
      </div>
    `;

    card.addEventListener("click", () => {
      const itemType = item.spotifyType || item.type?.toLowerCase();
      const itemId = item.spotifyId || item.id;

      if (itemType && itemId) {
        window.location.href = `details.html?type=${itemType}&id=${itemId}`;
      }
    });

    timelineList.appendChild(card);
  });
}