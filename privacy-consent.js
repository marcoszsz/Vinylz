const ACCEPTED_KEY = "vinylPrivacyAccepted";
const ACCEPTED_AT_KEY = "vinylPrivacyAcceptedAt";
const TERMS_VERSION_KEY = "vinylPrivacyTermsVersion";
const TERMS_VERSION = "2026-04-30";
const allowedNextPages = new Set(["login.html", "register.html"]);

const params = new URLSearchParams(window.location.search);
const requestedNext = params.get("next");
const nextPage = allowedNextPages.has(requestedNext) ? requestedNext : "login.html";

const termsCheck = document.getElementById("termsCheck");
const acceptBtn = document.getElementById("acceptPrivacyBtn");
const authLinks = document.querySelectorAll("[data-auth-link]");

termsCheck?.addEventListener("change", () => {
  if (acceptBtn) {
    acceptBtn.disabled = !termsCheck.checked;
  }
});

acceptBtn?.addEventListener("click", () => {
  if (!termsCheck?.checked) {
    showMessage("Marque a confirmacao para continuar.");
    return;
  }

  localStorage.setItem(ACCEPTED_KEY, "true");
  localStorage.setItem(ACCEPTED_AT_KEY, new Date().toISOString());
  localStorage.setItem(TERMS_VERSION_KEY, TERMS_VERSION);

  window.location.href = nextPage;
});

authLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (localStorage.getItem(ACCEPTED_KEY) === "true") return;

    event.preventDefault();
    showMessage("Aceite os termos para entrar ou criar sua conta.");
  });
});

function showMessage(message) {
  const toast = document.getElementById("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
