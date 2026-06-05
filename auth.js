import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const provider = new GoogleAuthProvider();

/* ELEMENTOS */
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const googleBtn = document.getElementById("googleLogin");
const togglePassword = document.getElementById("togglePassword");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

const registerForm = document.getElementById("registerForm");
const registerNameInput = document.getElementById("registerName");
const registerEmailInput = document.getElementById("registerEmail");
const registerPasswordInput = document.getElementById("registerPassword");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const passwordStrengthText = document.getElementById("passwordStrengthText");

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
      return "E-mail invalido.";
    case "auth/user-disabled":
      return "Essa conta foi desativada.";
    case "auth/user-not-found":
      return "Conta nao encontrada.";
    case "auth/wrong-password":
      return "Senha incorreta.";
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos.";
    case "auth/missing-password":
      return "Digite sua senha.";
    case "auth/popup-closed-by-user":
      return "Login com Google cancelado.";
    case "auth/network-request-failed":
      return "Erro de conexao. Verifique sua internet.";
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "A API Key do Firebase esta invalida. Confira o firebaseConfig.";
    default:
      return "Erro ao entrar. Tente novamente.";
  }
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._]/g, "");
}

function buildAuthEmail(username) {
  return `${username}@users.vinyl.local`;
}

async function getUsernameDoc(username) {
  const usernameLower = normalizeUsername(username);

  if (!usernameLower) return null;

  const usernameRef = doc(db, "usernames", usernameLower);
  const snapshot = await getDoc(usernameRef);

  return snapshot.exists() ? snapshot.data() : null;
}

async function createUserProfile(user, username, contactEmail, authEmail) {
  const usernameLower = normalizeUsername(username);
  const displayName = usernameLower || user.displayName || "usuario";

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      displayName,
      username: usernameLower,
      usernameLower,
      hasContactEmail: Boolean(contactEmail),
      photoURL: user.photoURL || "",
      spotifyConnected: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  if (contactEmail) {
    await setDoc(
      doc(db, "users", user.uid, "private", "account"),
      {
        contactEmail,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  await setDoc(
    doc(db, "usernames", usernameLower),
    {
      uid: user.uid,
      username: usernameLower,
      usernameLower,
      authEmail,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
}

async function buildAvailableUsername(base) {
  const normalizedBase = normalizeUsername(base) || "usuario";
  let candidate = normalizedBase.slice(0, 24);
  let suffix = 1;

  while (await getUsernameDoc(candidate)) {
    suffix += 1;
    const suffixText = String(suffix);
    candidate = `${normalizedBase.slice(0, 24 - suffixText.length)}${suffixText}`;
  }

  return candidate;
}

/* ENTRAR COM E-MAIL OU USUARIO */
async function getEmailFromUsername(username) {
  const usernameData = await getUsernameDoc(username);

  if (!usernameData) {
    throw new Error("USERNAME_NOT_FOUND");
  }

  if (!usernameData.authEmail) {
    throw new Error("EMAIL_NOT_FOUND");
  }

  return usernameData.authEmail;
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
        Se nao tiver @, tenta buscar o username no Firestore.
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
        showError("Usuario nao encontrado.");
      } else if (error.message === "EMAIL_NOT_FOUND") {
        showError("Esse usuario nao possui e-mail cadastrado.");
      } else {
        showError(getAuthErrorMessage(error));
      }

    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

/* REGISTRO COM USUARIO E SENHA */
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const username = normalizeUsername(registerNameInput?.value);
    const contactEmail = registerEmailInput?.value.trim().toLowerCase() || "";
    const password = registerPasswordInput?.value || "";

    if (!username || username.length < 3) {
      showError("O nome de usuario precisa ter pelo menos 3 caracteres.");
      return;
    }

    if (!/^[a-z0-9._]{3,24}$/.test(username)) {
      showError("Use apenas letras, numeros, ponto ou underline no usuario.");
      return;
    }

    if (password.length < 6) {
      showError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const submitBtn = registerForm.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Criando conta...";

      if (await getUsernameDoc(username)) {
        showError("Esse nome de usuario ja esta em uso.");
        return;
      }

      const authEmail = buildAuthEmail(username);
      const credential = await createUserWithEmailAndPassword(auth, authEmail, password);

      await updateProfile(credential.user, {
        displayName: username
      });

      await createUserProfile(credential.user, username, contactEmail, authEmail);

      showSuccess("Conta criada com sucesso!");

      setTimeout(() => {
        window.location.href = "onboarding.html";
      }, 700);
    } catch (error) {
      console.error("Erro ao criar conta:", error);
      showError(getAuthErrorMessage(error));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

if (registerPasswordInput && passwordStrengthText) {
  registerPasswordInput.addEventListener("input", () => {
    const password = registerPasswordInput.value;
    const score = [
      password.length >= 6,
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ].filter(Boolean).length;

    const labels = [
      "A senha precisa ter pelo menos 6 caracteres.",
      "Senha fraca.",
      "Senha media.",
      "Senha boa.",
      "Senha forte."
    ];

    passwordStrengthText.textContent = labels[score];
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

if (googleAuthBtn) {
  googleAuthBtn.addEventListener("click", async () => {
    clearMessages();

    try {
      googleAuthBtn.disabled = true;
      googleAuthBtn.textContent = "Abrindo Google...";

      const credential = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", credential.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const baseUsername =
          credential.user.email?.split("@")[0] ||
          credential.user.displayName ||
          "usuario";
        const username = await buildAvailableUsername(baseUsername);

        await createUserProfile(
          credential.user,
          username,
          credential.user.email || "",
          buildAuthEmail(username)
        );
      }

      showSuccess("Conta Google conectada!");

      setTimeout(() => {
        window.location.href = "onboarding.html";
      }, 700);
    } catch (error) {
      console.error("Erro no registro com Google:", error);
      showError(getAuthErrorMessage(error));
    } finally {
      googleAuthBtn.disabled = false;
      googleAuthBtn.textContent = "Criar conta com Google";
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

document.querySelectorAll(".toggle-password[data-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.target);

    if (!target) return;

    target.type = target.type === "password" ? "text" : "password";
  });
});

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
      showSuccess("Enviamos um link de recuperacao para seu e-mail.");
    } catch (error) {
      console.error("Erro ao recuperar senha:", error);
      showError(getAuthErrorMessage(error));
    }
  });
}

/* SE JA ESTIVER LOGADO */
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuario logado:", user.email);
  }
});
