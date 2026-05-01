import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* COLOQUE A MESMA CONFIG DO SEU auth.js */


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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