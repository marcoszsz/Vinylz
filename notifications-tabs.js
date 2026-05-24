import { auth, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const fallbackAvatar = "https://placehold.co/300x300/111111/ff4d6d?text=V";
const tabs = document.querySelectorAll(".notifications-tabs button");
const notificationsList = document.getElementById("notificationsList");
const miniNotificationsList = document.getElementById("miniNotificationsList");
const notificationBadge = document.getElementById("notificationBadge");

let currentFilter = "all";
let notificationsCache = [];
let unsubscribeNotifications = null;

function safeText(value, fallback = "") {
  return String(value || fallback)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFilteredNotifications() {
  if (currentFilter === "unread") {
    return notificationsCache.filter((item) => !item.read);
  }

  if (currentFilter === "follow_request") {
    return notificationsCache.filter((item) => item.type === "follow_request");
  }

  return notificationsCache;
}

function renderNotifications() {
  if (!notificationsList) return;

  const notifications = getFilteredNotifications();

  if (!notifications.length) {
    notificationsList.innerHTML = `
      <p class="empty-state">Nenhuma notificacao ainda.</p>
    `;
    return;
  }

  notificationsList.innerHTML = notifications.map((item) => `
    <div class="notification-item">
      <strong>${safeText(item.title || "Nova notificacao")}</strong>
      <p class="empty-state">${safeText(item.message || "Voce recebeu uma nova interacao.")}</p>
    </div>
  `).join("");
}

function renderMiniNotifications() {
  if (!miniNotificationsList) return;

  const notifications = notificationsCache.slice(0, 3);

  if (!notifications.length) {
    miniNotificationsList.innerHTML = `
      <p class="empty-state">Nenhuma notificacao ainda.</p>
    `;
    return;
  }

  miniNotificationsList.innerHTML = notifications.map((item) => `
    <div class="notification-mini-item">
      <img src="${safeText(item.fromUserAvatar || fallbackAvatar)}" alt="Avatar">

      <div>
        <strong>${safeText(item.title || "Notificacao")}</strong>
        <span>${safeText(item.message || "Nova interacao")}</span>
      </div>
    </div>
  `).join("");
}

function updateBadge() {
  if (!notificationBadge) return;

  const unreadCount = notificationsCache.filter((item) => !item.read).length;
  notificationBadge.hidden = unreadCount === 0;
  notificationBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
}

function renderAllNotificationViews() {
  renderNotifications();
  renderMiniNotifications();
  updateBadge();
}

tabs.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    tabs.forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.notificationFilter || "all";

    renderNotifications();
  }, true);
});

onAuthStateChanged(auth, (user) => {
  if (unsubscribeNotifications) {
    unsubscribeNotifications();
    unsubscribeNotifications = null;
  }

  notificationsCache = [];
  renderAllNotificationViews();

  if (!user) return;

  const notificationsQuery = query(
    collection(db, "notifications"),
    where("toUserId", "==", user.uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
    notificationsCache = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderAllNotificationViews();
  }, (error) => {
    console.error("Erro notificacoes:", error);

    if (notificationsList) {
      notificationsList.innerHTML = `
        <p class="empty-state">Erro ao carregar notificacoes.</p>
      `;
    }
  });
});