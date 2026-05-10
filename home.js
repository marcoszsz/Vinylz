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
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ELEMENTOS */

const navAvatar = document.getElementById("navAvatar");
const navUsername = document.getElementById("navUsername");

const homeAvatar = document.getElementById("homeAvatar");
const homeName = document.getElementById("homeName");
const homeUsername = document.getElementById("homeUsername");

const homePostsCount = document.getElementById("homePostsCount");
const homeFavoritesCount = document.getElementById("homeFavoritesCount");

const logoutBtn = document.getElementById("logoutBtn");

const quickSearchInput = document.getElementById("quickSearchInput");
const quickSearchBtn = document.getElementById("quickSearchBtn");

const toast = document.getElementById("toast");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");

/* MOBILE MENU */

mobileMenuBtn?.addEventListener("click", () => {
  mobileMenu?.classList.toggle("show");
});

/* AUTH */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await loadUser(user);
  await loadStats(user.uid);
});

/* LOAD USER */

async function loadUser(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    const data = userSnap.exists() ? userSnap.data() : {};

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

    setImg(navAvatar, avatar);
    setImg(homeAvatar, avatar);

    setText(navUsername, username);

    setText(homeName, displayName);
    setText(homeUsername, `@${username}`);
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

    setText(homePostsCount, String(postsSnap.size));

  } catch (error) {
    console.warn(error);
  }

  try {

    const favsQuery = query(
      collection(db, "favorites"),
      where("userId", "==", uid)
    );

    const favsSnap = await getDocs(favsQuery);

    setText(homeFavoritesCount, String(favsSnap.size));

  } catch (error) {
    console.warn(error);
  }
}

/* SEARCH */

quickSearchBtn?.addEventListener("click", performSearch);

quickSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    performSearch();
  }
});

function performSearch() {
  const value = quickSearchInput?.value.trim();

  if (!value) {
    showToast("Digite algo para buscar.");
    return;
  }

  window.location.href = `search.html?q=${encodeURIComponent(value)}`;
}

/* CHIPS */

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    const query = button.dataset.search;

    if (!query) return;

    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
  });
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

/* HELPERS */

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setImg(element, src) {
  if (!element) return;

  element.src = src;

  element.onerror = () => {
    element.src =
      "https://api.dicebear.com/8.x/shapes/svg?seed=vinyl";
  };
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