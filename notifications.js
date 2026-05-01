import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

/* =========================
   ELEMENTOS
========================= */

const notificationsList = document.getElementById("notificationsList");
const miniNotificationsList = document.getElementById("miniNotificationsList");
const notificationBadge = document.getElementById("notificationBadge");
const notificationTabs = document.querySelectorAll("[data-notification-filter]");
const toast = document.getElementById("toast");

const DEFAULT_AVATAR = "https://placehold.co/120x120/111111/ff4d6d?text=V";

let currentUser = null;
let allNotifications = [];
let currentFilter = "all";

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  currentUser = user;
  listenNotifications(user.uid);
});

/* =========================
   LISTENER
========================= */

function listenNotifications(uid) {
  const notificationsQuery = query(
    collection(db, "notifications"),
    where("toUserId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  onSnapshot(
    notificationsQuery,
    async (snapshot) => {
      allNotifications = [];

      for (const notificationDoc of snapshot.docs) {
        allNotifications.push({
          id: notificationDoc.id,
          ...notificationDoc.data()
        });
      }

      updateBadge();
      await renderNotifications();
      await renderMiniNotifications();
    },
    (error) => {
      console.error("Erro ao carregar notificações:", error);

      if (notificationsList) {
        notificationsList.innerHTML = `
          <p class="empty-state">Erro ao carregar notificações.</p>
        `;
      }

      if (miniNotificationsList) {
        miniNotificationsList.innerHTML = `
          <p class="empty-state">Erro ao carregar.</p>
        `;
      }
    }
  );
}

/* =========================
   BADGE
========================= */

function updateBadge() {
  if (!notificationBadge) return;

  const unreadCount = allNotifications.filter((item) => !item.read).length;

  if (unreadCount <= 0) {
    notificationBadge.hidden = true;
    notificationBadge.textContent = "0";
    return;
  }

  notificationBadge.hidden = false;
  notificationBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
}

/* =========================
   FILTROS
========================= */

notificationTabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    notificationTabs.forEach((button) => button.classList.remove("active"));

    tab.classList.add("active");
    currentFilter = tab.dataset.notificationFilter || "all";

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

/* =========================
   RENDER PRINCIPAL
========================= */

async function renderNotifications() {
  if (!notificationsList) return;

  const notifications = getFilteredNotifications();

  notificationsList.innerHTML = "";

  if (!notifications.length) {
    notificationsList.innerHTML = `
      <p class="empty-state">Nenhuma notificação por aqui.</p>
    `;
    return;
  }

  for (const notification of notifications) {
    const card = await createNotificationCard(notification, false);
    notificationsList.appendChild(card);
  }
}

/* =========================
   RENDER MINI SIDEBAR
========================= */

async function renderMiniNotifications() {
  if (!miniNotificationsList) return;

  const recentNotifications = allNotifications.slice(0, 4);

  miniNotificationsList.innerHTML = "";

  if (!recentNotifications.length) {
    miniNotificationsList.innerHTML = `
      <p class="empty-state">Nenhuma notificação ainda.</p>
    `;
    return;
  }

  for (const notification of recentNotifications) {
    const card = await createNotificationCard(notification, true);
    miniNotificationsList.appendChild(card);
  }
}

/* =========================
   CARD
========================= */

async function createNotificationCard(notification, mini = false) {
  const fromUser = await getUserData(notification.fromUid);

  const name =
    fromUser?.displayName ||
    fromUser?.name ||
    fromUser?.username ||
    "Alguém";

  const username = fromUser?.username ? `@${fromUser.username}` : "";
  const avatar = fromUser?.photoURL || fromUser?.avatar || DEFAULT_AVATAR;

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

    card.addEventListener("click", () => {
      markNotificationAsRead(notification.id);
    });

    return card;
  }

  if (notification.type === "follow_request") {
    const alreadyAnswered =
      notification.status === "accepted" ||
      notification.status === "declined";

    card.innerHTML = `
      <img src="${escapeHTML(avatar)}" alt="Avatar">

      <div class="notification-content">
        <strong>${escapeHTML(name)}</strong>
        <p>${escapeHTML(username)} pediu para seguir você.</p>

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
      const acceptBtn = card.querySelector(".accept-btn");
      const declineBtn = card.querySelector(".decline-btn");

      acceptBtn?.addEventListener("click", async (event) => {
        event.stopPropagation();
        await acceptFollowRequest(notification);
      });

      declineBtn?.addEventListener("click", async (event) => {
        event.stopPropagation();
        await declineFollowRequest(notification);
      });
    }

    card.addEventListener("click", () => {
      markNotificationAsRead(notification.id);
    });

    return card;
  }

  card.innerHTML = `
    <img src="${escapeHTML(avatar)}" alt="Avatar">

    <div class="notification-content">
      <strong>${escapeHTML(name)}</strong>
      <p>${escapeHTML(getNotificationText(notification, username))}</p>
    </div>
  `;

  card.addEventListener("click", () => {
    markNotificationAsRead(notification.id);
  });

  return card;
}

function getNotificationText(notification, username = "") {
  if (notification.type === "follow") {
    return `${username} começou a seguir você.`;
  }

  if (notification.type === "follow_accept") {
    return `${username} aceitou seu pedido para seguir.`;
  }

  if (notification.type === "follow_request") {
    return `${username} pediu para seguir você.`;
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

  return "Nova notificação.";
}

/* =========================
   ACEITAR / RECUSAR PEDIDO
========================= */

async function acceptFollowRequest(notification) {
  if (!currentUser) return;

  try {
    const requestId = notification.requestId;

    if (!requestId) {
      showMessage("Pedido inválido.");
      return;
    }

    const requestRef = doc(db, "followRequests", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      showMessage("Pedido não encontrado.");
      return;
    }

    const request = requestSnap.data();

    if (request.toUid !== currentUser.uid) {
      showMessage("Você não pode responder esse pedido.");
      return;
    }

    if (request.status !== "pending") {
      showMessage("Esse pedido já foi respondido.");
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
      showMessage("Pedido inválido.");
      return;
    }

    const requestRef = doc(db, "followRequests", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      showMessage("Pedido não encontrado.");
      return;
    }

    const request = requestSnap.data();

    if (request.toUid !== currentUser.uid) {
      showMessage("Você não pode responder esse pedido.");
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

/* =========================
   MARCAR COMO LIDA
========================= */

async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;

  try {
    const ref = doc(db, "notifications", notificationId);

    await updateDoc(ref, {
      read: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
  }
}

/* =========================
   HELPERS
========================= */

async function getUserData(uid) {
  if (!uid) return null;

  try {
    const userSnap = await getDoc(doc(db, "users", uid));

    if (!userSnap.exists()) return null;

    return userSnap.data();
  } catch (error) {
    console.error("Erro ao buscar usuário da notificação:", error);
    return null;
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

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}