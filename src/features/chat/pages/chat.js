import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  canInteractWithUser,
  isBlockedBetweenUsers
} from "./blockCheck.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSpkdZnlh4sr5vm0w-QC9poiU4e2uAS2M",
  authDomain: "vinyl-4b187.firebaseapp.com",
  projectId: "vinyl-4b187",
  storageBucket: "vinyl-4b187.firebasestorage.app",
  messagingSenderId: "155456309182",
  appId: "1:155456309182:web:451a778d4110630c421bef",
  measurementId: "G-JHM9MGEZX1"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const targetUid = urlParams.get("uid");

const targetName = document.getElementById("targetName");
const targetAvatar = document.getElementById("targetAvatar");
const targetStatus = document.getElementById("targetStatus");
const targetProfileLink = document.getElementById("targetProfileLink");

const messagesContainer = document.getElementById("messagesContainer");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

const chatOptionsBtn = document.getElementById("chatOptionsBtn");
const chatOptionsMenu = document.getElementById("chatOptionsMenu");
const viewProfileBtn = document.getElementById("viewProfileBtn");
const muteUserBtn = document.getElementById("muteUserBtn");
const blockUserBtn = document.getElementById("blockUserBtn");
const reportUserBtn = document.getElementById("reportUserBtn");

const attachBtn = document.getElementById("attachBtn");
const attachMenu = document.getElementById("attachMenu");
const attachImageBtn = document.getElementById("attachImageBtn");
const attachMusicBtn = document.getElementById("attachMusicBtn");
const attachSpotifyBtn = document.getElementById("attachSpotifyBtn");
const musicQuickBtn = document.getElementById("musicQuickBtn");

const typingIndicator = document.getElementById("typingIndicator");
const typingText = document.getElementById("typingText");

const replyPreview = document.getElementById("replyPreview");
const replyPreviewName = document.getElementById("replyPreviewName");
const replyPreviewText = document.getElementById("replyPreviewText");
const cancelReplyBtn = document.getElementById("cancelReplyBtn");

const editPreview = document.getElementById("editPreview");
const editPreviewText = document.getElementById("editPreviewText");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmText = document.getElementById("confirmText");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmOkBtn = document.getElementById("confirmOkBtn");

const DEFAULT_AVATAR = "https://placehold.co/120x120/111111/ff4d6d?text=V";

let currentUser = null;
let targetUserData = null;
let unsubscribeMessages = null;
let replyingTo = null;
let editingMessage = null;
let messagesCache = [];

/* HELPERS */

function createChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return "";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getDayLabel(timestamp) {
  if (!timestamp) return "";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function extractFirstUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : "";
}

function cleanUrl(url) {
  return String(url || "")
    .trim()
    .replace(/[),.;!?]+$/g, "");
}

function getShortText(text, max = 70) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function getSenderName(uid) {
  if (!uid) return "Usuário";
  if (uid === currentUser?.uid) return "Você";

  return (
    targetUserData?.displayName ||
    targetUserData?.name ||
    targetUserData?.username ||
    "Usuário"
  );
}

function getRenderedMessageById(messageId) {
  return messagesCache.find((message) => message.id === messageId) || null;
}

/* LINK PREVIEW */

function getLinkPreviewData(url) {
  if (!url) return null;

  const clean = cleanUrl(url);

  let parsed;

  try {
    parsed = new URL(clean);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace("www.", "");

  if (host.includes("spotify.com")) {
    let title = "Música no Spotify";

    if (parsed.pathname.includes("/track/")) title = "Faixa no Spotify";
    if (parsed.pathname.includes("/album/")) title = "Álbum no Spotify";
    if (parsed.pathname.includes("/playlist/")) title = "Playlist no Spotify";
    if (parsed.pathname.includes("/artist/")) title = "Artista no Spotify";

    return {
      provider: "Spotify",
      title,
      description: "Toque para abrir no Spotify",
      image: "",
      url: clean,
      icon: "♪"
    };
  }

  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    return {
      provider: "YouTube",
      title: "Vídeo no YouTube",
      description: "Toque para abrir no YouTube",
      image: "",
      url: clean,
      icon: "▶"
    };
  }

  if (host.includes("soundcloud.com")) {
    return {
      provider: "SoundCloud",
      title: "Faixa no SoundCloud",
      description: "Toque para abrir no SoundCloud",
      image: "",
      url: clean,
      icon: "☁"
    };
  }

  if (host.includes("twitter.com") || host.includes("x.com")) {
    return {
      provider: "X / Twitter",
      title: "Publicação no X",
      description: "Toque para abrir a publicação",
      image: "",
      url: clean,
      icon: "𝕏"
    };
  }

  if (host.includes("instagram.com")) {
    return {
      provider: "Instagram",
      title: "Post no Instagram",
      description: "Toque para abrir no Instagram",
      image: "",
      url: clean,
      icon: "◎"
    };
  }

  if (host.includes("tiktok.com")) {
    return {
      provider: "TikTok",
      title: "Vídeo no TikTok",
      description: "Toque para abrir no TikTok",
      image: "",
      url: clean,
      icon: "♫"
    };
  }

  return {
    provider: host,
    title: parsed.hostname,
    description: "Abrir link",
    image: "",
    url: clean,
    icon: "↗"
  };
}

async function fetchRealLinkPreview(url) {
  if (!url) return null;

  try {
    const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      return getLinkPreviewData(url);
    }

    const data = await response.json();

    return {
      provider: data.provider || "Link",
      title: data.title || "Abrir link",
      description: data.description || data.url || "",
      image: data.image || "",
      url: data.url || url,
      icon: data.icon || "↗"
    };
  } catch (error) {
    console.error("Erro ao buscar preview real:", error);
    return getLinkPreviewData(url);
  }
}

/* CONFIRM MODAL */

function showConfirmModal({
  title = "Confirmar ação",
  text = "Tem certeza?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar"
} = {}) {
  return new Promise((resolve) => {
    if (!confirmModal || !confirmOkBtn || !confirmCancelBtn) {
      resolve(confirm(text));
      return;
    }

    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmOkBtn.textContent = confirmLabel;
    confirmCancelBtn.textContent = cancelLabel;

    confirmModal.hidden = false;
    confirmModal.classList.remove("closing");

    function close(result) {
      confirmModal.classList.add("closing");

      setTimeout(() => {
        confirmModal.hidden = true;
        confirmModal.classList.remove("closing");

        confirmOkBtn.removeEventListener("click", onConfirm);
        confirmCancelBtn.removeEventListener("click", onCancel);
        confirmModal.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onKeydown);

        resolve(result);
      }, 160);
    }

    function onConfirm() {
      close(true);
    }

    function onCancel() {
      close(false);
    }

    function onBackdrop(event) {
      if (event.target.classList.contains("confirm-backdrop")) {
        close(false);
      }
    }

    function onKeydown(event) {
      if (event.key === "Escape") close(false);
      if (event.key === "Enter") close(true);
    }

    confirmOkBtn.addEventListener("click", onConfirm);
    confirmCancelBtn.addEventListener("click", onCancel);
    confirmModal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeydown);
  });
}

/* STATES */

function renderLoadingMessage() {
  if (!messagesContainer) return;

  messagesContainer.innerHTML = `
    <div class="chat-loading-state">
      <div class="chat-loader"></div>
      <p>Carregando mensagens...</p>
    </div>
  `;
}

function renderEmptyMessage(
  title = "Nenhuma mensagem ainda.",
  subtitle = "Mande um “oi” para começar a conversa."
) {
  if (!messagesContainer) return;

  messagesContainer.innerHTML = `
    <div class="chat-empty-state">
      <div class="chat-empty-icon">♪</div>
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(subtitle)}</p>
    </div>
  `;
}

function setChatDisabled(message) {
  if (messageInput) {
    messageInput.disabled = true;
    messageInput.placeholder = message;
  }

  if (sendMessageBtn) sendMessageBtn.disabled = true;
  if (attachBtn) attachBtn.disabled = true;
  if (musicQuickBtn) musicQuickBtn.disabled = true;

  if (targetStatus) {
    targetStatus.textContent = message;
  }
}

/* TARGET USER */

async function loadTargetUser() {
  if (!targetUid) {
    renderEmptyMessage("Usuário inválido.", "Não foi possível abrir esta conversa.");
    setChatDisabled("Usuário inválido");
    return;
  }

  const userRef = doc(db, "users", targetUid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    renderEmptyMessage("Usuário não encontrado.", "Esse perfil não existe mais.");
    setChatDisabled("Usuário não encontrado");
    return;
  }

  targetUserData = userSnap.data();

  const name =
    targetUserData.name ||
    targetUserData.displayName ||
    targetUserData.username ||
    "Usuário";

  const avatar =
    targetUserData.photoURL ||
    targetUserData.avatar ||
    targetUserData.profileImage ||
    DEFAULT_AVATAR;

  if (targetName) targetName.textContent = name;

  if (targetAvatar) {
    targetAvatar.src = avatar;
    targetAvatar.onerror = () => {
      targetAvatar.src = DEFAULT_AVATAR;
    };
  }

  if (targetStatus) {
    targetStatus.textContent = "Online agora";
  }

  if (targetProfileLink) {
    targetProfileLink.href = `profile.html?uid=${encodeURIComponent(targetUid)}`;
  }
}

/* REPLY / EDIT */

function startReply(message) {
  if (!message || message.deleted) return;

  if (editingMessage) {
    cancelEdit();
  }

  replyingTo = {
    messageId: message.id,
    senderUid: message.senderUid,
    senderName: getSenderName(message.senderUid),
    text: getShortText(message.text || message.preview?.title || "Mensagem")
  };

  if (replyPreviewName) {
    replyPreviewName.textContent = `Respondendo ${replyingTo.senderName}`;
  }

  if (replyPreviewText) {
    replyPreviewText.textContent = replyingTo.text;
  }

  if (replyPreview) {
    replyPreview.hidden = false;
  }

  messageInput?.focus();
}

function cancelReply() {
  replyingTo = null;

  if (replyPreview) {
    replyPreview.hidden = true;
  }

  if (replyPreviewText) {
    replyPreviewText.textContent = "";
  }
}

function startEdit(message) {
  if (!message || message.deleted) return;
  if (message.senderUid !== currentUser.uid) return;

  editingMessage = message;
  replyingTo = null;

  if (replyPreview) replyPreview.hidden = true;

  if (editPreviewText) {
    editPreviewText.textContent = getShortText(message.text || "");
  }

  if (editPreview) {
    editPreview.hidden = false;
  }

  if (messageInput) {
    messageInput.value = message.text || "";
    messageInput.focus();
  }

  if (sendMessageBtn) {
    sendMessageBtn.textContent = "Salvar";
  }
}

function cancelEdit() {
  editingMessage = null;

  if (editPreview) {
    editPreview.hidden = true;
  }

  if (editPreviewText) {
    editPreviewText.textContent = "";
  }

  if (messageInput) {
    messageInput.value = "";
  }

  if (sendMessageBtn) {
    sendMessageBtn.textContent = "Enviar";
  }
}

/* RENDER MESSAGE PARTS */

function renderReplyBox(replyTo) {
  if (!replyTo) return "";

  return `
    <div class="reply-box">
      <strong>${escapeHTML(replyTo.senderName || "Mensagem")}</strong>
      <p>${escapeHTML(replyTo.text || "")}</p>
    </div>
  `;
}

function renderEditedLabel(message) {
  return message.edited ? `<span class="edited-label">editado</span>` : "";
}

function getReactionSummary(reactions = {}) {
  const counts = {};

  Object.values(reactions || {}).forEach((emoji) => {
    if (!emoji) return;
    counts[emoji] = (counts[emoji] || 0) + 1;
  });

  return Object.entries(counts);
}

function renderReactions(message) {
  const reactions = getReactionSummary(message.reactions);

  if (!reactions.length) return "";

  return `
    <div class="message-reactions">
      ${reactions.map(([emoji, count]) => `
        <span class="reaction-pill">${escapeHTML(emoji)} ${count}</span>
      `).join("")}
    </div>
  `;
}

function renderDeletedMessage(message, isMine) {
  return `
    <div class="message-bubble deleted-message">
      <p>Mensagem apagada</p>
      <span>
        ${formatTime(message.createdAt)}
        ${isMine ? `<span class="message-status">${message.read ? "Visto" : "Enviado"}</span>` : ""}
      </span>
    </div>
  `;
}

function renderTextMessage(message, isMine) {
  if (message.deleted) {
    return renderDeletedMessage(message, isMine);
  }

  return `
    <div class="message-bubble">
      ${renderReplyBox(message.replyTo)}
      <p>${escapeHTML(message.text || "")}</p>
      <span>
        ${formatTime(message.createdAt)}
        ${renderEditedLabel(message)}
        ${isMine ? `<span class="message-status">${message.read ? "Visto" : "Enviado"}</span>` : ""}
      </span>
    </div>
  `;
}

function renderMusicMessage(message, isMine) {
  if (message.deleted) {
    return renderDeletedMessage(message, isMine);
  }

  const title =
    message.musicTitle ||
    String(message.text || "").replace(/^🎵\s*/, "") ||
    "Música compartilhada";

  const artist =
    message.musicArtist ||
    "VINYL";

  return `
    <div class="message-bubble">
      ${renderReplyBox(message.replyTo)}
      <div class="music-card">
        <div class="music-cover">♪</div>

        <div>
          <strong>${escapeHTML(title)}</strong>
          <small>${escapeHTML(artist)}</small>
        </div>
      </div>

      <span>
        ${formatTime(message.createdAt)}
        ${renderEditedLabel(message)}
        ${isMine ? `<span class="message-status">${message.read ? "Visto" : "Enviado"}</span>` : ""}
      </span>
    </div>
  `;
}

function renderLinkPreview(message, isMine) {
  if (message.deleted) {
    return renderDeletedMessage(message, isMine);
  }

  const preview =
    message.preview ||
    getLinkPreviewData(message.url || extractFirstUrl(message.text));

  if (!preview) {
    return renderTextMessage(message, isMine);
  }

  const textWithoutUrl = String(message.text || "")
    .replace(preview.url, "")
    .trim();

  return `
    <div class="message-bubble link-message-bubble">
      ${renderReplyBox(message.replyTo)}

      ${
        textWithoutUrl
          ? `<p class="message-caption">${escapeHTML(textWithoutUrl)}</p>`
          : ""
      }

      <a class="link-preview-card" href="${escapeHTML(preview.url)}" target="_blank" rel="noopener noreferrer">
        <div class="link-preview-cover">
          ${
            preview.image
              ? `<img src="${escapeHTML(preview.image)}" alt="${escapeHTML(preview.title || "Preview")}">`
              : escapeHTML(preview.icon || "↗")
          }
        </div>

        <div class="link-preview-content">
          <span>${escapeHTML(preview.provider || "Link")}</span>
          <strong>${escapeHTML(preview.title || "Abrir link")}</strong>
          <p>${escapeHTML(preview.description || preview.url)}</p>
        </div>
      </a>

      <span>
        ${formatTime(message.createdAt)}
        ${renderEditedLabel(message)}
        ${isMine ? `<span class="message-status">${message.read ? "Visto" : "Enviado"}</span>` : ""}
      </span>
    </div>
  `;
}

function renderMessageActions(message, isMine) {
  if (message.deleted) return "";

  return `
    <div class="message-actions">

      <div class="message-action-wrap">
        <button type="button">
          Reagir
        </button>

        <div class="reaction-picker">
          <button type="button" data-message-action="react" data-emoji="❤️" data-message-id="${message.id}">❤️</button>
          <button type="button" data-message-action="react" data-emoji="🔥" data-message-id="${message.id}">🔥</button>
          <button type="button" data-message-action="react" data-emoji="😂" data-message-id="${message.id}">😂</button>
          <button type="button" data-message-action="react" data-emoji="😮" data-message-id="${message.id}">😮</button>
          <button type="button" data-message-action="react" data-emoji="😢" data-message-id="${message.id}">😢</button>
        </div>
      </div>

      <button type="button" data-message-action="reply" data-message-id="${message.id}">
        Responder
      </button>

      <button type="button" data-message-action="copy" data-message-id="${message.id}">
        Copiar
      </button>

      ${
        isMine
          ? `
            <button type="button" data-message-action="edit" data-message-id="${message.id}">
              Editar
            </button>

            <button type="button" class="danger" data-message-action="delete" data-message-id="${message.id}">
              Apagar
            </button>
          `
          : ""
      }
    </div>
  `;
}

function renderMessages(messages) {
  if (!messagesContainer) return;

  messagesCache = messages;

  if (messages.length === 0) {
    renderEmptyMessage();
    return;
  }

  messagesContainer.innerHTML = "";

  let lastDay = "";

  messages.forEach((message) => {
    const currentDay = getDayLabel(message.createdAt);

    if (currentDay && currentDay !== lastDay) {
      const separator = document.createElement("div");
      separator.className = "day-separator";
      separator.textContent = currentDay;
      messagesContainer.appendChild(separator);
      lastDay = currentDay;
    }

    const isMine = message.senderUid === currentUser.uid;

    const messageDiv = document.createElement("div");
    messageDiv.className = isMine ? "message mine" : "message other";
    messageDiv.dataset.messageId = message.id;

    let content = "";

    if (message.type === "link") {
      content = renderLinkPreview(message, isMine);
    } else if (message.type === "music") {
      content = renderMusicMessage(message, isMine);
    } else {
      content = renderTextMessage(message, isMine);
    }

    messageDiv.innerHTML = `
      <div class="message-inner">
        ${content}
        ${renderReactions(message)}
        ${renderMessageActions(message, isMine)}
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/* FIRESTORE */

function listenMessages() {
  if (!currentUser || !targetUid) return;

  const chatId = createChatId(currentUser.uid, targetUid);

  const messagesQuery = query(
    collection(db, "messages"),
    where("chatId", "==", chatId),
    where("participants", "array-contains", currentUser.uid),
    orderBy("createdAt", "asc")
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    async (snapshot) => {
      const messages = [];

      snapshot.forEach((docSnap) => {
        messages.push({
          id: docSnap.id,
          ref: docSnap.ref,
          ...docSnap.data()
        });
      });

      await markReceivedMessagesAsRead(snapshot);
      renderMessages(messages);
    },
    (error) => {
      console.error("Erro ao ouvir mensagens:", error);
      renderEmptyMessage(
        "Erro ao carregar mensagens.",
        "Verifique as permissões do Firestore e tente novamente."
      );
    }
  );
}

async function markReceivedMessagesAsRead(snapshot) {
  if (!currentUser || !snapshot || snapshot.empty) return;

  const batch = writeBatch(db);
  let count = 0;

  snapshot.forEach((docSnap) => {
    const message = docSnap.data();

    if (
      message.receiverUid === currentUser.uid &&
      message.senderUid !== currentUser.uid &&
      message.read !== true
    ) {
      batch.update(docSnap.ref, {
        read: true,
        updatedAt: serverTimestamp()
      });

      count++;
    }
  });

  if (count > 0) {
    try {
      await batch.commit();
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
    }
  }
}

async function sendMessage(text, extraData = {}) {
  if (!currentUser) {
    alert("Você precisa estar logado.");
    return;
  }

  if (!targetUid) {
    alert("Usuário inválido.");
    return;
  }

  const cleanText = String(text || "").trim();

  if (!cleanText) {
    alert("Digite uma mensagem.");
    return;
  }

  const allowed = await canInteractWithUser(currentUser.uid, targetUid);
  if (!allowed) return;

  const detectedUrl = extractFirstUrl(cleanText);
  const cleanDetectedUrl = detectedUrl ? cleanUrl(detectedUrl) : "";
  const preview = cleanDetectedUrl
    ? await fetchRealLinkPreview(cleanDetectedUrl)
    : null;

  const messageType = extraData.type || (preview ? "link" : "text");
  const chatId = createChatId(currentUser.uid, targetUid);

  await addDoc(collection(db, "messages"), {
    chatId,
    senderUid: currentUser.uid,
    receiverUid: targetUid,
    participants: [currentUser.uid, targetUid],
    text: cleanText,
    type: messageType,
    url: cleanDetectedUrl,
    preview: preview || null,
    musicTitle: extraData.musicTitle || "",
    musicArtist: extraData.musicArtist || "",
    replyTo: replyingTo || null,
    reactions: {},
    edited: false,
    editedAt: null,
    read: false,
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  cancelReply();
}

async function updateExistingMessage(text) {
  if (!editingMessage || !currentUser) return;

  const cleanText = String(text || "").trim();

  if (!cleanText) {
    alert("Digite uma mensagem.");
    return;
  }

  const detectedUrl = extractFirstUrl(cleanText);
  const cleanDetectedUrl = detectedUrl ? cleanUrl(detectedUrl) : "";
  const preview = cleanDetectedUrl
    ? await fetchRealLinkPreview(cleanDetectedUrl)
    : null;

  const messageType = preview ? "link" : "text";

  await updateDoc(doc(db, "messages", editingMessage.id), {
    text: cleanText,
    type: messageType,
    url: cleanDetectedUrl,
    preview: preview || null,
    edited: true,
    editedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  cancelEdit();
}

async function deleteMessage(messageId) {
  if (!messageId) return;

  const confirmDelete = await showConfirmModal({
    title: "Apagar mensagem?",
    text: "Essa mensagem será apagada para todos na conversa.",
    confirmLabel: "Apagar",
    cancelLabel: "Cancelar"
  });

  if (!confirmDelete) return;

  try {
    const messageRef = doc(db, "messages", messageId);

    await updateDoc(messageRef, {
      deleted: true,
      deletedBy: currentUser.uid,
      deletedAt: serverTimestamp(),
      text: "Mensagem apagada",
      type: "text",
      url: "",
      preview: null,
      musicTitle: "",
      musicArtist: "",
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao apagar mensagem:", error);
    alert("Não foi possível apagar a mensagem.");
  }
}

async function toggleReaction(messageId, emoji) {
  if (!currentUser || !messageId || !emoji) return;

  const message = getRenderedMessageById(messageId);

  if (!message || message.deleted) return;

  const currentReaction = message.reactions?.[currentUser.uid];
  const fieldPath = `reactions.${currentUser.uid}`;

  try {
    await updateDoc(doc(db, "messages", messageId), {
      [fieldPath]: currentReaction === emoji ? "" : emoji,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao reagir:", error);
    alert("Não foi possível reagir.");
  }
}

async function copyMessageText(message) {
  if (!message || message.deleted) return;

  try {
    await navigator.clipboard.writeText(message.text || "");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = message.text || "";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

/* USER ACTIONS */

async function muteUser() {
  if (!currentUser || !targetUid) return;

  try {
    await setDoc(doc(db, "users", currentUser.uid, "userControls", targetUid), {
      targetUid,
      muted: true,
      muteUntil: null,
      updatedAt: serverTimestamp()
    }, { merge: true });

    alert("Usuário silenciado.");
  } catch (error) {
    console.error("Erro ao silenciar:", error);
    alert("Não foi possível silenciar.");
  }
}

async function blockUser() {
  if (!currentUser || !targetUid) return;

  const confirmBlock = await showConfirmModal({
    title: "Bloquear usuário?",
    text: "Essa pessoa não poderá interagir com você.",
    confirmLabel: "Bloquear",
    cancelLabel: "Cancelar"
  });

  if (!confirmBlock) return;

  try {
    await setDoc(doc(db, "users", currentUser.uid, "userControls", targetUid), {
      targetUid,
      blocked: true,
      blockUntil: null,
      updatedAt: serverTimestamp()
    }, { merge: true });

    alert("Usuário bloqueado.");
    window.location.href = "home.html";
  } catch (error) {
    console.error("Erro ao bloquear:", error);
    alert("Não foi possível bloquear.");
  }
}

function reportUser() {
  alert("Denúncia registrada. Vamos analisar esse perfil.");
}

/* EVENTS */

chatForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = messageInput.value;

  try {
    sendMessageBtn.disabled = true;

    if (editingMessage) {
      await updateExistingMessage(text);
    } else {
      await sendMessage(text);
      messageInput.value = "";
      messageInput.focus();
    }

    if (typingIndicator) {
      typingIndicator.hidden = true;
    }
  } catch (error) {
    console.error("Erro ao enviar/salvar mensagem:", error);
    alert("Erro ao enviar mensagem. Tente novamente.");
  } finally {
    sendMessageBtn.disabled = false;
  }
});

messagesContainer?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-message-action]");

  if (!button) return;

  const action = button.dataset.messageAction;
  const messageId = button.dataset.messageId;
  const message = getRenderedMessageById(messageId);

  if (!message) return;

  if (action === "reply") {
    startReply(message);
  }

  if (action === "delete") {
    await deleteMessage(messageId);
  }

  if (action === "react") {
    const emoji = button.dataset.emoji;
    await toggleReaction(messageId, emoji);
  }

  if (action === "copy") {
    await copyMessageText(message);
  }

  if (action === "edit") {
    startEdit(message);
  }
});

messageInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm?.requestSubmit();
  }
});

messageInput?.addEventListener("input", () => {
  if (!typingIndicator || !typingText) return;

  typingText.textContent = "Você está digitando...";
  typingIndicator.hidden = messageInput.value.trim().length === 0;
});

cancelReplyBtn?.addEventListener("click", cancelReply);
cancelEditBtn?.addEventListener("click", cancelEdit);

chatOptionsBtn?.addEventListener("click", () => {
  if (!chatOptionsMenu) return;
  chatOptionsMenu.hidden = !chatOptionsMenu.hidden;
});

attachBtn?.addEventListener("click", () => {
  if (!attachMenu) return;
  attachMenu.hidden = !attachMenu.hidden;
});

viewProfileBtn?.addEventListener("click", () => {
  if (!targetUid) return;
  window.location.href = `profile.html?uid=${encodeURIComponent(targetUid)}`;
});

muteUserBtn?.addEventListener("click", muteUser);
blockUserBtn?.addEventListener("click", blockUser);
reportUserBtn?.addEventListener("click", reportUser);

attachImageBtn?.addEventListener("click", () => {
  attachMenu.hidden = true;
  alert("Upload de imagem ainda será conectado.");
});

attachMusicBtn?.addEventListener("click", () => {
  attachMenu.hidden = true;
  messageInput.value = "🎵 ";
  messageInput.focus();
});

attachSpotifyBtn?.addEventListener("click", () => {
  attachMenu.hidden = true;
  messageInput.value = "Cole o link do Spotify aqui: ";
  messageInput.focus();
});

musicQuickBtn?.addEventListener("click", () => {
  messageInput.value = "Cole um link de música aqui: ";
  messageInput.focus();
});

document.addEventListener("click", (event) => {
  if (
    chatOptionsMenu &&
    chatOptionsBtn &&
    !chatOptionsMenu.contains(event.target) &&
    !chatOptionsBtn.contains(event.target)
  ) {
    chatOptionsMenu.hidden = true;
  }

  if (
    attachMenu &&
    attachBtn &&
    !attachMenu.contains(event.target) &&
    !attachBtn.contains(event.target)
  ) {
    attachMenu.hidden = true;
  }
});

/* AUTH */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  renderLoadingMessage();

  if (!targetUid) {
    renderEmptyMessage("Usuário inválido.", "Não foi possível abrir esta conversa.");
    setChatDisabled("Usuário inválido");
    return;
  }

  if (targetUid === currentUser.uid) {
    renderEmptyMessage("Chat indisponível.", "Você não pode abrir chat consigo mesmo.");
    setChatDisabled("Chat indisponível");
    return;
  }

  await loadTargetUser();

  const blocked = await isBlockedBetweenUsers(currentUser.uid, targetUid);

  if (blocked) {
    renderEmptyMessage("Conversa indisponível.", "Essa interação não está disponível.");
    setChatDisabled("Conversa indisponível");
    return;
  }

  listenMessages();
});

window.addEventListener("beforeunload", () => {
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }
});