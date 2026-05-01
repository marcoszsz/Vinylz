import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* CONFIG DO FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyCSpkdZnlh4sr5vm0w-QC9poiU4e2uAS2M",
  authDomain: "vinyl-4b187.firebaseapp.com",
  projectId: "vinyl-4b187",
  storageBucket: "vinyl-4b187.firebasestorage.app",
  messagingSenderId: "155456309182",
  appId: "1:155456309182:web:451a778d4110630c421bef",
  measurementId: "G-JHM9MGEZX1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/* ELEMENTOS */
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const googleBtn = document.getElementById("googleLogin");
const togglePassword = document.getElementById("togglePassword");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

/* MENSAGENS */
function showError(message) {
  if (!errorMessage) return;

  errorMessage.textContent = message;
  errorMessage.style.display = "block";

  if (successMessage) {
    successMessage.textContent = "";
    successMessage.style.display = "none";
  }
}

function showSuccess(message) {
  if (!successMessage) return;

  successMessage.textContent = message;
  successMessage.style.display = "block";

  if (errorMessage) {
    errorMessage.textContent = "";
    errorMessage.style.display = "none";
  }
}

function clearMessages() {
  if (errorMessage) {
    errorMessage.textContent = "";
    errorMessage.style.display = "none";
  }

  if (successMessage) {
    successMessage.textContent = "";
    successMessage.style.display = "none";
  }
}

/* TRADUZ ERROS */
function getAuthErrorMessage(error) {
  const code = error?.code;

  switch (code) {
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/user-disabled":
      return "Essa conta foi desativada.";
    case "auth/user-not-found":
      return "Conta não encontrada.";
    case "auth/wrong-password":
      return "Senha incorreta.";
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos.";
    case "auth/missing-password":
      return "Digite sua senha.";
    case "auth/popup-closed-by-user":
      return "Login com Google cancelado.";
    case "auth/network-request-failed":
      return "Erro de conexão. Verifique sua internet.";
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "A API Key do Firebase está inválida. Confira o firebaseConfig.";
    default:
      return "Erro ao entrar. Tente novamente.";
  }
}

/* ENTRAR COM E-MAIL OU USUÁRIO */
async function getEmailFromUsername(username) {
  const usersRef = collection(db, "users");

  const usernameQuery = query(
    usersRef,
    where("username", "==", username),
    limit(1)
  );

  const snapshot = await getDocs(usernameQuery);

  if (snapshot.empty) {
    throw new Error("USERNAME_NOT_FOUND");
  }

  const userData = snapshot.docs[0].data();

  if (!userData.email) {
    throw new Error("EMAIL_NOT_FOUND");
  }

  return userData.email;
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const loginValue = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!loginValue || !password) {
      showError("Preencha todos os campos.");
      return;
    }

    const submitBtn = loginForm.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Entrando...";

      let emailToLogin = loginValue;

      /*
        Se tiver @, entra como e-mail.
        Se não tiver @, tenta buscar o username no Firestore.
      */
      if (!loginValue.includes("@")) {
        emailToLogin = await getEmailFromUsername(loginValue);
      }

      await signInWithEmailAndPassword(auth, emailToLogin, password);

      showSuccess("Login realizado com sucesso!");

      setTimeout(() => {
        window.location.href = "home.html";
      }, 700);

    } catch (error) {
      console.error("Erro ao fazer login:", error);

      if (error.message === "USERNAME_NOT_FOUND") {
        showError("Usuário não encontrado.");
      } else if (error.message === "EMAIL_NOT_FOUND") {
        showError("Esse usuário não possui e-mail cadastrado.");
      } else {
        showError(getAuthErrorMessage(error));
      }

    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

/* LOGIN COM GOOGLE */
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    clearMessages();

    try {
      googleBtn.disabled = true;
      googleBtn.textContent = "Abrindo Google...";

      await signInWithPopup(auth, provider);

      showSuccess("Login com Google realizado!");

      setTimeout(() => {
        window.location.href = "home.html";
      }, 700);

    } catch (error) {
      console.error("Erro no login com Google:", error);
      showError(getAuthErrorMessage(error));

    } finally {
      googleBtn.disabled = false;
      googleBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.5l6.3 5.3C36.9 39.3 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        Entrar com Google
      `;
    }
  });
}

/* MOSTRAR / ESCONDER SENHA */
if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.setAttribute(
      "aria-label",
      isPassword ? "Esconder senha" : "Mostrar senha"
    );
  });
}

/* ESQUECI MINHA SENHA */
const forgotPasswordLink = document.querySelector(".forgot-password");

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async (event) => {
    event.preventDefault();
    clearMessages();

    const email = emailInput.value.trim();

    if (!email || !email.includes("@")) {
      showError("Digite seu e-mail no campo acima para recuperar a senha.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showSuccess("Enviamos um link de recuperação para seu e-mail.");
    } catch (error) {
      console.error("Erro ao recuperar senha:", error);
      showError(getAuthErrorMessage(error));
    }
  });
}

/* SE JÁ ESTIVER LOGADO */
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuário logado:", user.email);
  }
});