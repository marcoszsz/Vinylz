import { auth, db } from "./firebase.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const navbarLinks = document.getElementById("navbarLinks");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const logoutBtn = document.getElementById("logoutBtn");
const navbarAvatar = document.getElementById("navbarAvatar");
const navbarUsername = document.getElementById("navbarUsername");

const notificationsList = document.getElementById("notificationsList");
const miniNotificationsList = document.getElementById("miniNotificationsList");
const notificationBadge = document.getElementById("notificationBadge");
const notificationTabs = document.querySelectorAll("[data-notification-filter]");
const filterLabel = document.getElementById("filterLabel");
const totalNotificationsCount = document.getElementById("totalNotificationsCount");
const unreadNotificationsCount = document.getElementById("unreadNotificationsCount");
const requestNotificationsCount = document.getElementById("requestNotificationsCount");
const toast = document.getElementById("toast");

const DEFAULT_AVATAR = "https://placehold.co/120x120/111111/ff4d6d?text=V";
const filterNames = {
  all: "Todas",
  follow_request: "Pedidos",
  unread: "Nao lidas"
};

let currentUser = null;
let allNotifications = [];
let currentFilter = "all";
let unsubscribeNotifications = null;
const userCache = new Map();

mobileMenuBtn?.addEventListener("click", () => {
  navbarLinks?.classList.toggle("open");
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    showMessage("Nao foi possivel sair agora.");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  await renderCurrentUser(user);
  listenNotifications(user.uid);
});

async function renderCurrentUser(user) {
  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const data = userSnap.exists() ? userSnap.data() : {};

    const avatar = data.photoURL || data.avatar || user.photoURL || DEFAULT_AVATAR;
    const username = data.username || user.email?.split("@")[0] || "perfil";

    if (navbarAvatar) navbarAvatar.src = avatar;
    if (navbarUsername) navbarUsername.textContent = username;
  } catch (error) {
    console.warn("Erro ao carregar usuario:", error);
  }
}

function listenNotifications(uid) {
  if (unsubscribeNotifications) {
    unsubscribeNotifications();
    unsubscribeNotifications = null;
  }

  const notificationsQuery = query(
    collection(db, "notifications"),
    where("toUserId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  unsubscribeNotifications = onSnapshot(
    notificationsQuery,
    async (snapshot) => {
      allNotifications = snapshot.docs.map((notificationDoc) => ({
        id: notificationDoc.id,
        ...notificationDoc.data()
      }));

      updateSummary();
      await renderNotifications();
      await renderMiniNotifications();
    },
    (error) => {
      console.error("Erro ao carregar notificacoes:", error);
      renderErrorState();
    }
  );
}

function updateSummary() {
  const unreadCount = allNotifications.filter((item) => !item.read).length;
  const requestCount = allNotifications.filter((item) => item.type === "follow_request").length;

  if (totalNotificationsCount) totalNotificationsCount.textContent = String(allNotifications.length);
  if (unreadNotificationsCount) unreadNotificationsCount.textContent = String(unreadCount);
  if (requestNotificationsCount) requestNotificationsCount.textContent = String(requestCount);
  if (filterLabel) filterLabel.textContent = filterNames[currentFilter] || "Todas";

  if (!notificationBadge) return;

  notificationBadge.hidden = unreadCount === 0;
  notificationBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
}

notificationTabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    notificationTabs.forEach((button) => button.classList.remove("active"));

    tab.classList.add("active");
    currentFilter = tab.dataset.notificationFilter || "all";

    updateSummary();
    await renderNotifications();
  });
});

function getFilteredNotifications() {
  if (currentFilter === "unread") {
    return allNotifications.filter((item) => !item.read);
  }

  if (currentFilter === "follow_request") {
    return allNotifications.filter((item) => item.type === "follow_request");
  }

  return allNotifications;
}

async function renderNotifications() {
  if (!notificationsList) return;

  const notifications = getFilteredNotifications();
  notificationsList.innerHTML = "";

  if (!notifications.length) {
    notificationsList.innerHTML = `
      <div class="empty-panel">
        <strong>Nada por aqui</strong>
        <p>Quando chegarem novas interacoes, elas aparecem nessa aba.</p>
      </div>
    `;
    return;
  }

  const cards = await Promise.all(
    notifications.map((notification) => createNotificationCard(notification, false))
  );

  cards.forEach((card) => notificationsList.appendChild(card));
}

async function renderMiniNotifications() {
  if (!miniNotificationsList) return;

  const recentNotifications = allNotifications.slice(0, 4);
  miniNotificationsList.innerHTML = "";

  if (!recentNotifications.length) {
    miniNotificationsList.innerHTML = `
      <p class="empty-state">Nenhuma notificacao ainda.</p>
    `;
    return;
  }

  const cards = await Promise.all(
    recentNotifications.map((notification) => createNotificationCard(notification, true))
  );

  cards.forEach((card) => miniNotificationsList.appendChild(card));
}

async function createNotificationCard(notification, mini = false) {
  const fromUser = await getUserData(notification.fromUid || notification.fromUserId);

  const name =
    notification.fromUserName ||
    fromUser?.displayName ||
    fromUser?.name ||
    fromUser?.username ||
    "Alguem";

  const username = fromUser?.username ? `@${fromUser.username}` : "";
  const avatar =
    notification.fromUserAvatar ||
    fromUser?.photoURL ||
    fromUser?.avatar ||
    DEFAULT_AVATAR;

  const card = document.createElement("article");
  card.className = mini
    ? "mini-notification-item"
    : notification.read
      ? "notification-card"
      : "notification-card unread";

  if (mini) {
    card.innerHTML = `
      <img src="${escapeHTML(avatar)}" alt="Avatar">

      <div>
        <strong>${escapeHTML(name)}</strong>
        <span>${escapeHTML(getNotificationText(notification, username))}</span>
      </div>
    `;

    card.addEventListener("click", () => markNotificationAsRead(notification.id));
    return card;
  }

  if (notification.type === "follow_request") {
    renderFollowRequestCard(card, notification, name, username, avatar);
    return card;
  }

  card.innerHTML = `
    <img src="${escapeHTML(avatar)}" alt="Avatar">

    <div class="notification-content">
      <div class="notification-line">
        <strong>${escapeHTML(name)}</strong>
        ${notification.read ? "" : `<span class="unread-pill">Nova</span>`}
      </div>
      <p>${escapeHTML(getNotificationText(notification, username))}</p>
      <span class="notification-time">${escapeHTML(formatDate(notification.createdAt))}</span>
    </div>
  `;

  card.addEventListener("click", () => markNotificationAsRead(notification.id));
  return card;
}

function renderFollowRequestCard(card, notification, name, username, avatar) {
  const alreadyAnswered =
    notification.status === "accepted" ||
    notification.status === "declined";

  card.innerHTML = `
    <img src="${escapeHTML(avatar)}" alt="Avatar">

    <div class="notification-content">
      <div class="notification-line">
        <strong>${escapeHTML(name)}</strong>
        ${notification.read ? "" : `<span class="unread-pill">Nova</span>`}
      </div>
      <p>${escapeHTML(username)} pediu para seguir voce.</p>
      <span class="notification-time">${escapeHTML(formatDate(notification.createdAt))}</span>

      ${
        alreadyAnswered
          ? `<span class="notification-status">${notification.status === "accepted" ? "Aceito" : "Recusado"}</span>`
          : `
            <div class="notification-actions">
              <button type="button" class="accept-btn">Aceitar</button>
              <button type="button" class="decline-btn">Recusar</button>
            </div>
          `
      }
    </div>
  `;

  if (!alreadyAnswered) {
    card.querySelector(".accept-btn")?.addEventListener("click", async (event) => {
      event.stopPropagation();
      await acceptFollowRequest(notification);
    });

    card.querySelector(".decline-btn")?.addEventListener("click", async (event) => {
      event.stopPropagation();
      await declineFollowRequest(notification);
    });
  }

  card.addEventListener("click", () => markNotificationAsRead(notification.id));
}

function getNotificationText(notification, username = "") {
  if (notification.message) return notification.message;

  if (notification.type === "follow") {
    return `${username} comecou a seguir voce.`;
  }

  if (notification.type === "follow_accept") {
    return `${username} aceitou seu pedido para seguir.`;
  }

  if (notification.type === "follow_request") {
    return `${username} pediu para seguir voce.`;
  }

  if (notification.type === "like") {
    return `${username} curtiu seu post.`;
  }

  if (notification.type === "comment") {
    return `${username} comentou no seu post.`;
  }

  if (notification.type === "message") {
    return `${username} enviou uma mensagem.`;
  }

  return notification.title || "Nova notificacao.";
}

async function acceptFollowRequest(notification) {
  if (!currentUser) return;

  try {
    const requestId = notification.requestId;

    if (!requestId) {
      showMessage("Pedido invalido.");
      return;
    }

    const requestRef = doc(db, "followRequests", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      showMessage("Pedido nao encontrado.");
      return;
    }

    const request = requestSnap.data();

    if (request.toUid !== currentUser.uid) {
      showMessage("Voce nao pode responder esse pedido.");
      return;
    }

    if (request.status !== "pending") {
      showMessage("Esse pedido ja foi respondido.");
      return;
    }

    const fromUid = request.fromUid;
    const toUid = request.toUid;

    await setDoc(doc(db, "users", fromUid, "following", toUid), {
      uid: toUid,
      userId: toUid,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, "users", toUid, "followers", fromUid), {
      uid: fromUid,
      userId: fromUid,
      createdAt: serverTimestamp()
    });

    await updateDoc(requestRef, {
      status: "accepted",
      answeredAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, "notifications", notification.id), {
      read: true,
      status: "accepted",
      updatedAt: serverTimestamp()
    });

    await setDoc(doc(db, "notifications", `follow_accept_${toUid}_${fromUid}`), {
      type: "follow_accept",
      fromUid: toUid,
      toUserId: fromUid,
      read: false,
      createdAt: serverTimestamp()
    }, { merge: true });

    showMessage("Pedido aceito.");
  } catch (error) {
    console.error("Erro ao aceitar pedido:", error);
    showMessage("Erro ao aceitar pedido.");
  }
}

async function declineFollowRequest(notification) {
  if (!currentUser) return;

  try {
    const requestId = notification.requestId;

    if (!requestId) {
      showMessage("Pedido invalido.");
      return;
    }

    const requestRef = doc(db, "followRequests", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      showMessage("Pedido nao encontrado.");
      return;
    }

    const request = requestSnap.data();

    if (request.toUid !== currentUser.uid) {
      showMessage("Voce nao pode responder esse pedido.");
      return;
    }

    await updateDoc(requestRef, {
      status: "declined",
      answeredAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, "notifications", notification.id), {
      read: true,
      status: "declined",
      updatedAt: serverTimestamp()
    });

    showMessage("Pedido recusado.");
  } catch (error) {
    console.error("Erro ao recusar pedido:", error);
    showMessage("Erro ao recusar pedido.");
  }
}

async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;

  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao marcar notificacao como lida:", error);
  }
}

async function getUserData(uid) {
  if (!uid) return null;
  if (userCache.has(uid)) return userCache.get(uid);

  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    const userData = userSnap.exists() ? userSnap.data() : null;
    userCache.set(uid, userData);
    return userData;
  } catch (error) {
    console.error("Erro ao buscar usuario da notificacao:", error);
    return null;
  }
}

function renderErrorState() {
  if (notificationsList) {
    notificationsList.innerHTML = `
      <div class="empty-panel">
        <strong>Erro ao carregar</strong>
        <p>Nao foi possivel buscar suas notificacoes agora.</p>
      </div>
    `;
  }

  if (miniNotificationsList) {
    miniNotificationsList.innerHTML = `
      <p class="empty-state">Erro ao carregar.</p>
    `;
  }
}

function showMessage(message) {
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function formatDate(timestamp) {
  if (!timestamp) return "agora";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString("pt-BR");
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
