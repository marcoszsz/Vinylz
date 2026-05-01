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

const messagesList = document.getElementById("messagesList");
const userSearchInput = document.getElementById("userSearchInput");
const searchResults = document.getElementById("searchResults");

const params = new URLSearchParams(window.location.search);
const targetUserId = params.get("user");

let currentUser = null;
let allUsers = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  if (targetUserId) {
    window.location.replace(`chat.html?user=${encodeURIComponent(targetUserId)}`);
    return;
  }

  await loadUsers();
  listenChats();
});

async function loadUsers() {
  const usersSnap = await getDocs(collection(db, "users"));

  allUsers = usersSnap.docs
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
    const chats = snapshot.docs
      .map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }))
      .sort((a, b) => getTimestampMillis(b.updatedAt) - getTimestampMillis(a.updatedAt));

    renderChats(chats);
  }, (error) => {
    console.error("Erro ao carregar conversas:", error);
    messagesList.innerHTML = `
      <p class="message">Nao foi possivel carregar suas conversas.</p>
    `;
  });
}

function renderChats(chats) {
  messagesList.innerHTML = "";

  if (!chats.length) {
    messagesList.innerHTML = `
      <p class="message">Nenhuma conversa ainda.</p>
    `;
    return;
  }

  chats.forEach((chat) => {
    const otherUserId = chat.members.find((uid) => uid !== currentUser.uid);
    const otherUser = allUsers.find((user) => user.id === otherUserId);

    const avatar =
      otherUser?.photoURL ||
      getFallbackAvatar(otherUser?.displayName || otherUser?.username || "Usuário");

    const card = document.createElement("article");
    card.className = "message-card";

    card.innerHTML = `
      <img src="${avatar}" alt="${otherUser?.displayName || "Usuário"}">

      <div class="message-info">
        <h3>${otherUser?.displayName || otherUser?.username || "Usuário Vinyl"}</h3>
        <p>${chat.lastMessage || "Abrir conversa"}</p>
      </div>

      <span class="message-time">${formatDate(chat.updatedAt)}</span>
    `;

    card.addEventListener("click", () => {
      window.location.href = `chat.html?user=${otherUserId}`;
    });

    messagesList.appendChild(card);
  });
}

userSearchInput?.addEventListener("input", () => {
  const text = userSearchInput.value.trim().toLowerCase();

  if (!text) {
    searchResults.innerHTML = "";
    return;
  }

  const users = allUsers.filter((user) => {
    const fullText = `${user.displayName || ""} ${user.username || ""}`.toLowerCase();
    return fullText.includes(text);
  });

  renderUserResults(users);
});

function renderUserResults(users) {
  searchResults.innerHTML = "";

  if (!users.length) {
    searchResults.innerHTML = `
      <p class="message">Nenhum usuário encontrado.</p>
    `;
    return;
  }

  users.forEach((user) => {
    const avatar =
      user.photoURL ||
      getFallbackAvatar(user.displayName || user.username || "Usuário");

    const card = document.createElement("article");
    card.className = "message-card";

    card.innerHTML = `
      <img src="${avatar}" alt="${user.displayName || "Usuário"}">

      <div class="message-info">
        <h3>${user.displayName || user.username || "Usuário Vinyl"}</h3>
        <p>Começar conversa</p>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `chat.html?user=${user.id}`;
    });

    searchResults.appendChild(card);
  });
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "";

  return timestamp.toDate().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
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
