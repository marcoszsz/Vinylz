import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const chatWidget = document.getElementById("chatWidget");

let currentUser = null;
let allUsers = [];

if (chatWidget) {
  chatWidget.innerHTML = `
    <button id="chatFloatingBtn" class="chat-floating-btn">
      💬
      <span id="chatFloatingBadge" class="chat-floating-badge">0</span>
    </button>

    <aside id="chatPanel" class="chat-panel">
      <div class="chat-panel-header">
        <h3>Mensagens</h3>
        <button id="chatPanelClose" class="chat-panel-close">×</button>
      </div>

      <div class="chat-search">
        <input id="chatSearchInput" type="text" placeholder="Buscar usuário...">
      </div>

      <div id="chatList" class="chat-list">
        <p class="chat-empty">Carregando conversas...</p>
      </div>
    </aside>
  `;
}

const chatFloatingBtn = document.getElementById("chatFloatingBtn");
const chatPanel = document.getElementById("chatPanel");
const chatPanelClose = document.getElementById("chatPanelClose");
const chatSearchInput = document.getElementById("chatSearchInput");
const chatList = document.getElementById("chatList");
const chatFloatingBadge = document.getElementById("chatFloatingBadge");

chatFloatingBtn?.addEventListener("click", () => {
  chatPanel.classList.toggle("show");
});

chatPanelClose?.addEventListener("click", () => {
  chatPanel.classList.remove("show");
});

onAuthStateChanged(auth, async (user) => {
  if (!user || !chatWidget) {
    chatWidget?.remove();
    return;
  }

  currentUser = user;

  await loadUsers();
  listenChats();
});

async function loadUsers() {
  const snapshot = await getDocs(collection(db, "users"));

  allUsers = snapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }))
    .filter((user) => user.id !== currentUser.uid);
}

function listenChats() {
  const chatsQuery = query(
    collection(db, "chats"),
    where("members", "array-contains", currentUser.uid)
  );

  onSnapshot(chatsQuery, (snapshot) => {
    const myChats = snapshot.docs
      .map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }))
      .sort((a, b) => getTimestampMillis(b.updatedAt) - getTimestampMillis(a.updatedAt));

    renderConversations(myChats);
  }, (error) => {
    console.error("Erro ao carregar conversas:", error);
    chatList.innerHTML = `
      <p class="chat-empty">Nao foi possivel carregar conversas.</p>
    `;
  });
}

function renderConversations(chats) {
  chatList.innerHTML = "";

  if (!chats.length) {
    chatList.innerHTML = `
      <p class="chat-empty">
        Nenhuma conversa ainda. Busque um usuário para começar.
      </p>
    `;
    return;
  }

  chats.forEach((chat) => {
    const otherUserId = chat.members.find((uid) => uid !== currentUser.uid);
    const otherUser = allUsers.find((user) => user.id === otherUserId);

    const item = document.createElement("div");
    item.className = "chat-conversation-item";

    const avatar =
      otherUser?.photoURL ||
      getFallbackAvatar(otherUser?.displayName || "Usuário");

    item.innerHTML = `
      <img src="${avatar}" alt="${otherUser?.displayName || "Usuário"}">

      <div>
        <h4>${otherUser?.displayName || otherUser?.username || "Usuário Vinyl"}</h4>
        <p>${chat.lastMessage || "Abrir conversa"}</p>
      </div>
    `;

    item.addEventListener("click", () => {
      window.location.href = `chat.html?user=${otherUserId}`;
    });

    chatList.appendChild(item);
  });
}

chatSearchInput?.addEventListener("input", () => {
  const text = chatSearchInput.value.trim().toLowerCase();

  if (!text) {
    listenChats();
    return;
  }

  const users = allUsers.filter((user) => {
    const name = `${user.displayName || ""} ${user.username || ""}`.toLowerCase();
    return name.includes(text);
  });

  renderUserSearch(users);
});

function renderUserSearch(users) {
  chatList.innerHTML = "";

  if (!users.length) {
    chatList.innerHTML = `
      <p class="chat-empty">Nenhum usuário encontrado.</p>
    `;
    return;
  }

  users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "chat-user-item";

    const avatar =
      user.photoURL ||
      getFallbackAvatar(user.displayName || user.username || "Usuário");

    item.innerHTML = `
      <img src="${avatar}" alt="${user.displayName || "Usuário"}">

      <div>
        <h4>${user.displayName || user.username || "Usuário Vinyl"}</h4>
        <p>Começar conversa</p>
      </div>
    `;

    item.addEventListener("click", () => {
      window.location.href = `chat.html?user=${user.id}`;
    });

    chatList.appendChild(item);
  });
}

function getFallbackAvatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=ff4d6d&color=fff`;
}

function getTimestampMillis(timestamp) {
  return timestamp?.toMillis?.() || 0;
}
