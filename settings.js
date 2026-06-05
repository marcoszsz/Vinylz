// settings.js

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ELEMENTOS */

const logoutBtn = document.getElementById("logoutBtn");

const userMiniCard = document.getElementById("userMiniCard");

const privateProfile = document.getElementById("privateProfile");
const showInSearch = document.getElementById("showInSearch");
const showActivity = document.getElementById("showActivity");

const allowMessages = document.getElementById("allowMessages");
const messagesFollowersOnly = document.getElementById("messagesFollowersOnly");

const allowNotifications = document.getElementById("allowNotifications");
const notifyFollows = document.getElementById("notifyFollows");

const spotifyStatus = document.getElementById("spotifyStatus");
const spotifyConnectBtn = document.getElementById("spotifyConnectBtn");
const spotifyDisconnectBtn = document.getElementById("spotifyDisconnectBtn");

const resetPasswordBtn = document.getElementById("resetPasswordBtn");

const saveBtn = document.getElementById("saveBtn");
const saveStateTitle = document.getElementById("saveStateTitle");
const saveStateText = document.getElementById("saveStateText");

const toast = document.getElementById("toast");

/* ESTADO */

let currentUser = null;
let currentUserData = {};
let hasUnsavedChanges = false;

/* AUTH */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await loadUserSettings();
});

/* LOGOUT */

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    showToast("Não foi possível sair.");
  }
});

/* LOAD */

async function loadUserSettings() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    currentUserData = userSnap.exists() ? userSnap.data() : {};

    renderUserMiniCard();
    applySettingsToUI(currentUserData);
    updateSpotifyUI(currentUserData);

    setSaveState("Tudo salvo", "Suas configurações estão sincronizadas.");
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    showToast("Não foi possível carregar suas configurações.");
  }
}

/* USER MINI CARD */

function renderUserMiniCard() {
  if (!userMiniCard) return;

  const username =
    currentUserData.username ||
    currentUser.email?.split("@")[0] ||
    "usuario";

  const displayName =
    currentUserData.displayName ||
    currentUserData.name ||
    username ||
    "Usuário Vinyl";

  const avatar =
    currentUserData.photoURL ||
    currentUserData.avatar ||
    currentUser.photoURL ||
    "https://api.dicebear.com/8.x/shapes/svg?seed=vinyl";

  userMiniCard.classList.remove("loading");

  userMiniCard.innerHTML = `
    <img
      class="user-mini-avatar"
      src="${escapeHTML(avatar)}"
      alt="${escapeHTML(displayName)}"
      onerror="this.src='https://api.dicebear.com/8.x/shapes/svg?seed=vinyl'"
    />

    <div class="user-info">
      <strong>${escapeHTML(displayName)}</strong>
      <span>@${escapeHTML(username)}</span>
    </div>
  `;
}

/* APPLY SETTINGS */

function applySettingsToUI(data = {}) {
  const privacy = data.privacy || {};
  const messages = data.messages || {};
  const notifications = data.notifications || {};

  setChecked(privateProfile, Boolean(privacy.privateProfile));
  setChecked(showInSearch, privacy.showInSearch !== false);
  setChecked(showActivity, privacy.showActivity !== false);

  setChecked(allowMessages, messages.allowMessages !== false);
  setChecked(messagesFollowersOnly, Boolean(messages.followersOnly));

  setChecked(allowNotifications, notifications.allowNotifications !== false);
  setChecked(notifyFollows, notifications.notifyFollows !== false);

  hasUnsavedChanges = false;
}

/* CHANGE DETECTION */

[
  privateProfile,
  showInSearch,
  showActivity,
  allowMessages,
  messagesFollowersOnly,
  allowNotifications,
  notifyFollows
].forEach((input) => {
  input?.addEventListener("change", () => {
    hasUnsavedChanges = true;
    setSaveState("Alterações pendentes", "Clique em salvar para sincronizar.");
  });
});

/* SAVE */

saveBtn?.addEventListener("click", saveSettings);

async function saveSettings() {
  if (!currentUser) return;

  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;

    const payload = {
      privacy: {
        privateProfile: Boolean(privateProfile?.checked),
        showInSearch: Boolean(showInSearch?.checked),
        showActivity: Boolean(showActivity?.checked)
      },

      messages: {
        allowMessages: Boolean(allowMessages?.checked),
        followersOnly: Boolean(messagesFollowersOnly?.checked)
      },

      notifications: {
        allowNotifications: Boolean(allowNotifications?.checked),
        notifyFollows: Boolean(notifyFollows?.checked)
      },

      updatedAt: serverTimestamp()
    };

    await setDoc(
      doc(db, "users", currentUser.uid),
      payload,
      { merge: true }
    );

    currentUserData = {
      ...currentUserData,
      ...payload
    };

    hasUnsavedChanges = false;

    setSaveState("Tudo salvo", "Suas configurações estão sincronizadas.");
    showToast("Configurações salvas.");
  } catch (error) {
    console.error("Erro ao salvar:", error);
    showToast("Não foi possível salvar. Verifique as regras do Firestore.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salvar alterações`;
  }
}

/* SPOTIFY */

spotifyConnectBtn?.addEventListener("click", () => {
  window.location.href = "onboarding.html?connect=spotify";
});

spotifyDisconnectBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const confirmed = confirm("Desconectar Spotify da sua conta?");
  if (!confirmed) return;

  try {
    spotifyDisconnectBtn.disabled = true;
    spotifyDisconnectBtn.textContent = "Desconectando...";

    await updateDoc(doc(db, "users", currentUser.uid), {
      spotifyConnected: false,
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyUserId: null,
      spotifyDisconnectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    currentUserData.spotifyConnected = false;
    updateSpotifyUI(currentUserData);

    showToast("Spotify desconectado.");
  } catch (error) {
    console.error("Erro ao desconectar Spotify:", error);
    showToast("Não foi possível desconectar.");
  } finally {
    spotifyDisconnectBtn.disabled = false;
    spotifyDisconnectBtn.textContent = "Desconectar Spotify";
  }
});

function updateSpotifyUI(data = {}) {
  const connected =
    data.spotifyConnected ||
    data.spotify?.connected ||
    data.spotifyAccessToken ||
    data.spotifyRefreshToken;

  if (!spotifyStatus) return;

  if (connected) {
    spotifyStatus.classList.remove("disconnected");
    spotifyStatus.classList.add("connected");
    spotifyStatus.innerHTML = `<span></span> Spotify conectado`;

    spotifyConnectBtn?.classList.add("hidden");
    spotifyDisconnectBtn?.classList.remove("hidden");
  } else {
    spotifyStatus.classList.remove("connected");
    spotifyStatus.classList.add("disconnected");
    spotifyStatus.innerHTML = `<span></span> Spotify não conectado`;

    spotifyConnectBtn?.classList.remove("hidden");
    spotifyDisconnectBtn?.classList.add("hidden");
  }
}

/* RESET PASSWORD */

resetPasswordBtn?.addEventListener("click", async () => {
  if (!currentUser?.email) {
    showToast("Sua conta não possui e-mail para redefinir senha.");
    return;
  }

  try {
    resetPasswordBtn.disabled = true;
    resetPasswordBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;

    await sendPasswordResetEmail(auth, currentUser.email);

    showToast("E-mail de redefinição enviado.");
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    showToast("Não foi possível enviar o e-mail.");
  } finally {
    resetPasswordBtn.disabled = false;
    resetPasswordBtn.innerHTML = `<i class="fa-solid fa-key"></i> Enviar redefinição de senha`;
  }
});

/* BEFORE LEAVE */

window.addEventListener("beforeunload", (event) => {
  if (!hasUnsavedChanges) return;

  event.preventDefault();
  event.returnValue = "";
});

/* HELPERS */

function setChecked(element, value) {
  if (element) {
    element.checked = Boolean(value);
  }
}

function setSaveState(title, text) {
  if (saveStateTitle) saveStateTitle.textContent = title;
  if (saveStateText) saveStateText.textContent = text;
}

function showToast(message) {
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}