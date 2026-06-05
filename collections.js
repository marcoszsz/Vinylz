import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DEFAULT_AVATAR = "https://placehold.co/120x120/111111/ff4d6d?text=V";
const DEFAULT_COVER = "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80";

let currentUser = null;
let currentUserData = {};
let collectionsCache = [];

const collectionForm = document.getElementById("collectionForm");
const collectionsGrid = document.getElementById("collectionsGrid");
const toast = document.getElementById("toast");

document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
  document.getElementById("navbarLinks")?.classList.toggle("open");
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

document.getElementById("quickVibes")?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-vibe]");
  if (!button) return;

  document.getElementById("collectionVibe").value = button.dataset.vibe;
  document.getElementById("collectionTitle").focus();
});

collectionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createCollection();
});

collectionsGrid?.addEventListener("submit", async (event) => {
  const form = event.target.closest(".item-form");
  if (!form) return;

  event.preventDefault();
  await addItem(form.dataset.id, form.querySelector("input")?.value);
  form.reset();
});

collectionsGrid?.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete]");
  if (!deleteButton) return;

  const ok = confirm("Excluir esta colecao?");
  if (!ok) return;

  collectionsCache = collectionsCache.filter((item) => item.id !== deleteButton.dataset.delete);
  await saveCollections();
  showToast("Colecao excluida.");
  renderCollections();
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  await loadProfile();
  await loadCollections();
});

async function loadProfile() {
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  currentUserData = userSnap.exists() ? userSnap.data() : {};

  const username = currentUserData.username || currentUser.email?.split("@")[0] || "usuario";
  const avatar = currentUserData.photoURL || currentUser.photoURL || DEFAULT_AVATAR;

  setText("navbarUsername", username);
  setImage("navbarAvatar", avatar);
}

async function loadCollections() {
  if (!currentUser) return;

  try {
    const snapshot = await getDoc(collectionsDocRef());
    const data = snapshot.exists() ? snapshot.data() : {};
    collectionsCache = Array.isArray(data.collections) ? data.collections : [];
    collectionsCache.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    renderCollections();
  } catch (error) {
    console.error("Erro ao carregar colecoes:", error);
    collectionsGrid.innerHTML = `<p class="empty-state">Nao foi possivel carregar suas colecoes.</p>`;
  }
}

async function createCollection() {
  const title = document.getElementById("collectionTitle").value.trim();
  const vibe = document.getElementById("collectionVibe").value;
  const cover = document.getElementById("collectionCover").value.trim();
  const note = document.getElementById("collectionNote").value.trim();

  if (!title) return;

  collectionsCache.unshift({
    id: createId(),
    title,
    vibe,
    cover,
    note,
    items: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  await saveCollections();
  collectionForm.reset();
  document.getElementById("collectionVibe").value = vibe;
  showToast("Colecao criada.");
  renderCollections();
}

async function addItem(collectionId, value) {
  const item = String(value || "").trim();
  if (!item) return;

  const collectionItem = collectionsCache.find((entry) => entry.id === collectionId);
  if (!collectionItem) return;

  const items = Array.isArray(collectionItem.items) ? collectionItem.items : [];
  collectionItem.items = [...new Set([...items, item])].slice(0, 30);
  collectionItem.updatedAt = Date.now();

  await saveCollections();
  showToast("Item adicionado.");
  renderCollections();
}

async function saveCollections() {
  await setDoc(
    collectionsDocRef(),
    {
      collections: collectionsCache,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

function renderCollections() {
  setText(
    "collectionsSummary",
    collectionsCache.length
      ? `${collectionsCache.length} colecao${collectionsCache.length === 1 ? "" : "es"} salvas.`
      : "Nenhuma colecao salva ainda."
  );

  if (!collectionsCache.length) {
    collectionsGrid.innerHTML = `<p class="empty-state">Crie sua primeira colecao para comecar.</p>`;
    return;
  }

  collectionsGrid.innerHTML = collectionsCache.map((item) => renderCollection(item)).join("");
}

function renderCollection(item) {
  const cover = safeUrl(item.cover) || DEFAULT_COVER;
  const items = Array.isArray(item.items) ? item.items.slice(0, 8) : [];

  return `
    <article class="collection-card">
      <div class="collection-cover">
        <img src="${cover}" alt="${escapeHTML(item.title || "Colecao")}">
        <span>${escapeHTML(item.vibe || "Vinyl")}</span>
      </div>

      <div class="collection-body">
        <div>
          <h3>${escapeHTML(item.title || "Colecao sem nome")}</h3>
          <p class="collection-note">${escapeHTML(item.note || "Sem nota ainda.")}</p>
        </div>

        <div class="collection-meta">
          <span>${items.length} item${items.length === 1 ? "" : "s"}</span>
          <span>${formatDate(item.updatedAt)}</span>
        </div>

        <ul class="item-list">
          ${
            items.length
              ? items.map((name) => `<li>${escapeHTML(name)}</li>`).join("")
              : `<li>Nenhum item adicionado.</li>`
          }
        </ul>

        <form class="item-form" data-id="${escapeHTML(item.id)}">
          <input type="text" maxlength="80" placeholder="Adicionar musica, album ou artista" />
          <button type="submit">Adicionar</button>
        </form>

        <div class="collection-actions">
          <button type="button" data-delete="${escapeHTML(item.id)}">Excluir</button>
        </div>
      </div>
    </article>
  `;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value ?? "");
}

function setImage(id, value) {
  const element = document.getElementById(id);
  if (element) element.src = value || DEFAULT_AVATAR;
}

function collectionsDocRef() {
  return doc(db, "users", currentUser.uid, "private", "collections");
}

function createId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    return "";
  }

  return "";
}

function formatDate(value) {
  if (!value) return "agora";
  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}
