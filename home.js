// home.js

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  writeBatch,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ELEMENTOS */

const logoutBtn = document.getElementById("logoutBtn");

const quickSearchInput =
  document.getElementById("quickSearchInput");

const quickSearchBtn =
  document.getElementById("quickSearchBtn");

const homeAvatar =
  document.getElementById("homeAvatar");

const homeName =
  document.getElementById("homeName");

const homeUsername =
  document.getElementById("homeUsername");

const homePostsCount =
  document.getElementById("homePostsCount");

const homeFavoritesCount =
  document.getElementById("homeFavoritesCount");

const toast =
  document.getElementById("toast");

/* NOTIFICATIONS */

const notificationBtn =
  document.getElementById("notificationBtn");

const notificationPopup =
  document.getElementById("notificationPopup");

const closeNotifications =
  document.getElementById("closeNotifications");

const notificationBadge =
  document.getElementById("notificationBadge");

const notificationList =
  document.getElementById("notificationList");

/* STATE */

let currentUser = null;
let unsubscribeNotifications = null;

/* AUTH */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await loadUser(user);
  await loadStats(user.uid);

  listenNotifications(user.uid);
});

/* USER */

async function loadUser(user) {

  try {

    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    const data =
      userSnap.exists()
        ? userSnap.data()
        : {};

    const username =
      data.username ||
      user.email?.split("@")[0] ||
      "usuario";

    const displayName =
      data.displayName ||
      data.name ||
      username;

    const avatar =
      data.photoURL ||
      data.avatar ||
      user.photoURL ||
      "https://api.dicebear.com/8.x/shapes/svg?seed=vinyl";

    if (homeAvatar) {
      homeAvatar.src = avatar;
    }

    if (homeName) {
      homeName.textContent = displayName;
    }

    if (homeUsername) {
      homeUsername.textContent = `@${username}`;
    }

  } catch (error) {

    console.error(error);
  }
}

/* STATS */

async function loadStats(uid) {

  try {

    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", uid)
    );

    const postsSnap = await getDocs(postsQuery);

    if (homePostsCount) {
      homePostsCount.textContent =
        postsSnap.size;
    }

  } catch (error) {

    console.warn(error);
  }

  try {

    const favoritesQuery = query(
      collection(db, "favorites"),
      where("userId", "==", uid)
    );

    const favoritesSnap =
      await getDocs(favoritesQuery);

    if (homeFavoritesCount) {
      homeFavoritesCount.textContent =
        favoritesSnap.size;
    }

  } catch (error) {

    console.warn(error);
  }
}

/* SEARCH */

quickSearchBtn?.addEventListener(
  "click",
  performSearch
);

quickSearchInput?.addEventListener(
  "keydown",
  (event) => {

    if (event.key === "Enter") {
      performSearch();
    }
  }
);

function performSearch() {

  const value =
    quickSearchInput?.value.trim();

  if (!value) {

    showToast(
      "Digite algo para pesquisar."
    );

    return;
  }

  window.location.href =
    `search.html?q=${encodeURIComponent(value)}`;
}

/* CHIPS */

document
  .querySelectorAll("[data-search]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        const value =
          button.dataset.search;

        if (!value) return;

        window.location.href =
          `search.html?q=${encodeURIComponent(value)}`;
      }
    );
  });

/* LOGOUT */

logoutBtn?.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

      window.location.href =
        "login.html";

    } catch (error) {

      console.error(error);

      showToast(
        "Não foi possível sair."
      );
    }
  }
);

/* NOTIFICATION POPUP */

notificationBtn?.addEventListener(
  "click",
  async (event) => {

    event.stopPropagation();

    notificationPopup?.classList.toggle(
      "hidden"
    );

    const isOpen =
      !notificationPopup?.classList.contains(
        "hidden"
      );

    if (isOpen) {
      await markNotificationsAsRead();
    }
  }
);

closeNotifications?.addEventListener(
  "click",
  () => {

    notificationPopup?.classList.add(
      "hidden"
    );
  }
);

notificationPopup?.addEventListener(
  "click",
  (event) => {

    event.stopPropagation();
  }
);

document.addEventListener(
  "click",
  () => {

    notificationPopup?.classList.add(
      "hidden"
    );
  }
);

/* REALTIME NOTIFICATIONS */

function listenNotifications(uid) {

  if (!notificationList) return;

  if (unsubscribeNotifications) {
    unsubscribeNotifications();
  }

  const notificationsQuery = query(
    collection(db, "notifications"),
    where("toUserId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  unsubscribeNotifications =
    onSnapshot(
      notificationsQuery,
      (snapshot) => {

        const notifications =
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          }));

        renderNotifications(
          notifications
        );

        updateNotificationBadge(
          notifications
        );
      },
      (error) => {

        console.error(
          "Erro notificações:",
          error
        );

        if (notificationList) {

          notificationList.innerHTML = `
            <div class="notification-empty">
              <strong>Erro ao carregar</strong>
              <p>Não foi possível carregar notificações.</p>
            </div>
          `;
        }
      }
    );
}

/* RENDER */

function renderNotifications(
  notifications
) {

  if (!notificationList) return;

  if (!notifications.length) {

    notificationList.innerHTML = `
      <div class="notification-empty">
        <strong>Nenhuma notificação</strong>

        <p>
          Quando alguém curtir,
          seguir ou responder você,
          aparecerá aqui.
        </p>
      </div>
    `;

    return;
  }

  notificationList.innerHTML =
    notifications
      .map((notification) => {

        const icon =
          getNotificationIcon(
            notification.type
          );

        const title =
          getNotificationTitle(
            notification
          );

        const message =
          notification.message ||
          getNotificationMessage(
            notification
          );

        const time =
          formatDate(
            notification.createdAt
          );

        const unreadClass =
          notification.read
            ? ""
            : "unread";

        const link =
          getNotificationLink(
            notification
          );

        return `
          <a
            href="${escapeHTML(link)}"
            class="notification-item ${unreadClass}"
          >

            <div class="notification-icon">
              ${icon}
            </div>

            <div>
              <strong>
                ${escapeHTML(title)}
              </strong>

              <p>
                ${escapeHTML(message)}
              </p>

              <small>
                ${time}
              </small>
            </div>

          </a>
        `;
      })
      .join("");
}

/* BADGE */

function updateNotificationBadge(
  notifications
) {

  if (!notificationBadge) return;

  const unreadCount =
    notifications.filter(
      (item) => !item.read
    ).length;

  if (unreadCount <= 0) {

    notificationBadge.classList.add(
      "hidden"
    );

    return;
  }

  notificationBadge.classList.remove(
    "hidden"
  );

  notificationBadge.textContent =
    unreadCount > 9
      ? "9+"
      : String(unreadCount);
}

/* MARK READ */

async function markNotificationsAsRead() {

  if (!currentUser) return;

  try {

    const unreadQuery = query(
      collection(db, "notifications"),
      where(
        "toUserId",
        "==",
        currentUser.uid
      ),
      where("read", "==", false),
      limit(20)
    );

    const snapshot =
      await getDocs(unreadQuery);

    if (snapshot.empty) return;

    const batch = writeBatch(db);

    snapshot.docs.forEach(
      (docSnap) => {

        batch.update(
          doc(
            db,
            "notifications",
            docSnap.id
          ),
          {
            read: true,
            readAt: serverTimestamp()
          }
        );
      }
    );

    await batch.commit();

  } catch (error) {

    console.warn(
      "Erro marcar notificações:",
      error
    );
  }
}

/* HELPERS */

function getNotificationIcon(type) {

  const icons = {
    like: "💗",
    follow: "👤",
    reply: "💬",
    repost: "🔁",
    favorite: "⭐",
    message: "📩",
    system: "🔔"
  };

  return icons[type] || "🔔";
}

function getNotificationTitle(
  notification
) {

  const fromName =
    notification.fromUserName ||
    notification.fromUsername ||
    "Alguém";

  const titles = {
    like:
      `${fromName} curtiu seu post`,

    follow:
      `${fromName} começou a seguir você`,

    reply:
      `${fromName} respondeu seu post`,

    repost:
      `${fromName} repostou seu post`,

    favorite:
      `${fromName} favoritou algo seu`,

    message:
      `${fromName} enviou uma mensagem`,

    system:
      "Notificação do Vinyl"
  };

  return (
    titles[notification.type] ||
    "Nova notificação"
  );
}

function getNotificationMessage(
  notification
) {

  const messages = {
    like:
      "Seu post recebeu uma nova curtida.",

    follow:
      "Você tem um novo seguidor.",

    reply:
      "Seu post recebeu uma resposta.",

    repost:
      "Seu post foi republicado.",

    favorite:
      "Algo seu foi favoritado.",

    message:
      "Você recebeu uma nova mensagem.",

    system:
      "Há novidades no Vinyl."
  };

  return (
    messages[notification.type] ||
    "Nova atividade."
  );
}

function getNotificationLink(
  notification
) {

  if (notification.postId) {
    return `timeline.html#post-${notification.postId}`;
  }

  if (notification.fromUserId) {
    return `profile.html?u=${notification.fromUserId}`;
  }

  return "timeline.html";
}

function formatDate(value) {

  if (!value) return "agora";

  const date =
    value.toDate
      ? value.toDate()
      : new Date(value);

  const diff =
    Date.now() - date.getTime();

  const minute = 60000;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) {
    return "agora";
  }

  if (diff < hour) {
    return `${Math.floor(diff / minute)}min atrás`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)}h atrás`;
  }

  return date.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "short"
    }
  );
}

function escapeHTML(value = "") {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* TOAST */

function showToast(message) {

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(
    () => {

      toast.classList.remove("show");

    },
    3000
  );
}