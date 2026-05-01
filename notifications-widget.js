import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const notificationsList = document.getElementById("notificationsList");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  listenNotifications(user.uid);
});

function listenNotifications(uid) {
  const q = query(
    collection(db, "notifications"),
    where("toUserId", "==", uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, async (snapshot) => {
    notificationsList.innerHTML = "";

    if (snapshot.empty) {
      notificationsList.innerHTML = `<p class="empty-state">Nenhuma notificação ainda.</p>`;
      return;
    }

    for (const notifDoc of snapshot.docs) {
      const notification = {
        id: notifDoc.id,
        ...notifDoc.data()
      };

      const card = await createNotificationCard(notification);
      notificationsList.appendChild(card);
    }
  }, (error) => {
    console.error("Erro ao carregar notificações:", error);
    notificationsList.innerHTML = `<p class="empty-state">Erro ao carregar notificações.</p>`;
  });
}

async function createNotificationCard(notification) {
  const card = document.createElement("article");
  card.className = notification.read ? "notification-card" : "notification-card unread";

  const fromUser = await getUserData(notification.fromUid);

  const name =
    fromUser?.displayName ||
    fromUser?.username ||
    "Alguém";

  const username = fromUser?.username ? `@${fromUser.username}` : "";
  const avatar = fromUser?.photoURL || "https://placehold.co/120x120/111111/ff4d6d?text=V";

  if (notification.type === "follow_request") {
    card.innerHTML = `
      <img src="${escapeHTML(avatar)}" alt="Avatar">

      <div class="notification-content">
        <strong>${escapeHTML(name)}</strong>
        <p>${escapeHTML(username)} pediu para seguir você.</p>

        <div class="notification-actions">
          <button type="button" class="accept-btn">Aceitar</button>
          <button type="button" class="decline-btn">Recusar</button>
        </div>
      </div>
    `;

    card.querySelector(".accept-btn").addEventListener("click", () => {
      acceptFollowRequest(notification);
    });

    card.querySelector(".decline-btn").addEventListener("click", () => {
      declineFollowRequest(notification);
    });

    return card;
  }

  if (notification.type === "follow") {
    card.innerHTML = `
      <img src="${escapeHTML(avatar)}" alt="Avatar">

      <div class="notification-content">
        <strong>${escapeHTML(name)}</strong>
        <p>${escapeHTML(username)} começou a seguir você.</p>
      </div>
    `;

    return card;
  }

  card.innerHTML = `
    <img src="${escapeHTML(avatar)}" alt="Avatar">

    <div class="notification-content">
      <strong>${escapeHTML(name)}</strong>
      <p>Nova notificação.</p>
    </div>
  `;

  return card;
}

async function acceptFollowRequest(notification) {
  const requestRef = doc(db, "followRequests", notification.requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    alert("Pedido não encontrado.");
    return;
  }

  const request = requestSnap.data();

  if (request.status !== "pending") {
    alert("Esse pedido já foi respondido.");
    return;
  }

  const fromUid = request.fromUid;
  const toUid = request.toUid;

  await setDoc(doc(db, "users", fromUid, "following", toUid), {
    uid: toUid,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "users", toUid, "followers", fromUid), {
    uid: fromUid,
    createdAt: serverTimestamp()
  });

  await updateDoc(requestRef, {
    status: "accepted",
    answeredAt: serverTimestamp()
  });

  await updateDoc(doc(db, "notifications", notification.id), {
    read: true,
    status: "accepted"
  });

  await setDoc(doc(db, "notifications", `follow_accept_${toUid}_${fromUid}`), {
    type: "follow_accept",
    fromUid: toUid,
    toUserId: fromUid,
    read: false,
    createdAt: serverTimestamp()
  }, { merge: true });
}

async function declineFollowRequest(notification) {
  const requestRef = doc(db, "followRequests", notification.requestId);

  await updateDoc(requestRef, {
    status: "declined",
    answeredAt: serverTimestamp()
  });

  await updateDoc(doc(db, "notifications", notification.id), {
    read: true,
    status: "declined"
  });
}

async function getUserData(uid) {
  if (!uid) return null;

  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}