import { auth } from "./firebase.js";

import {
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (error) {
      console.error("Erro ao sair:", error);
      alert("Erro ao sair. Tente novamente.");
    }
  });
}
