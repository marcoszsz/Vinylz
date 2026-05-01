import { auth } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginNavLink = document.getElementById("loginNavLink");
const primaryCta = document.getElementById("primaryCta");
const secondaryCta = document.getElementById("secondaryCta");

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  if (loginNavLink) {
    loginNavLink.textContent = "Abrir app";
    loginNavLink.href = "home.html";
  }

  if (primaryCta) {
    primaryCta.textContent = "Abrir meu Vinyl";
    primaryCta.href = "home.html";
  }

  if (secondaryCta) {
    secondaryCta.textContent = "Meu perfil";
    secondaryCta.href = "profile.html";
  }
});
