import {
  muteUser,
  hideUser,
  blockUser,
  unmuteUser,
  unhideUser,
  unblockUser,
  getUserControl,
  waitForUser
} from "./userControls.js";

let selectedAction = null;
let targetUid = null;

/*
  Aqui você precisa pegar o UID do perfil visitado.
  Exemplo:
  perfil.html?uid=abc123
*/
const urlParams = new URLSearchParams(window.location.search);
targetUid = urlParams.get("uid");

const controlModal = document.getElementById("controlModal");
const controlModalTitle = document.getElementById("controlModalTitle");
const cancelControlModal = document.getElementById("cancelControlModal");
const actionButtons = document.querySelectorAll("[data-action]");
const periodButtons = document.querySelectorAll("[data-period]");

function openControlModal(action) {
  selectedAction = action;

  const titles = {
    mute: "Silenciar por quanto tempo?",
    hide: "Ocultar por quanto tempo?",
    block: "Bloquear por quanto tempo?"
  };

  controlModalTitle.textContent = titles[action] || "Escolha o período";
  controlModal.classList.add("active");
}

function closeControlModal() {
  selectedAction = null;
  controlModal.classList.remove("active");
}

function showToast(message) {
  alert(message);
}

actionButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.action;

    if (!targetUid) {
      showToast("Usuário inválido.");
      return;
    }

    openControlModal(action);
  });
});

periodButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const period = button.dataset.period;

    if (!selectedAction || !targetUid) return;

    try {
      if (selectedAction === "mute") {
        await muteUser(targetUid, period);
        showToast("Usuário silenciado.");
      }

      if (selectedAction === "hide") {
        await hideUser(targetUid, period);
        showToast("Usuário ocultado.");
      }

      if (selectedAction === "block") {
        await blockUser(targetUid, period);
        showToast("Usuário bloqueado.");
      }

      closeControlModal();
      await updateControlButtons();

    } catch (error) {
      console.error("Erro ao aplicar controle:", error);
      showToast("Erro ao salvar ação. Tente novamente.");
    }
  });
});

if (cancelControlModal) {
  cancelControlModal.addEventListener("click", closeControlModal);
}

if (controlModal) {
  controlModal.addEventListener("click", (event) => {
    if (event.target === controlModal) {
      closeControlModal();
    }
  });
}

async function updateControlButtons() {
  if (!targetUid) return;

  const control = await getUserControl(targetUid);

  actionButtons.forEach((button) => {
    const action = button.dataset.action;

    if (action === "mute") {
      button.textContent = control?.muted ? "Remover silenciar" : "Silenciar usuário";

      button.onclick = async () => {
        if (control?.muted) {
          await unmuteUser(targetUid);
          showToast("Usuário não está mais silenciado.");
          await updateControlButtons();
        } else {
          openControlModal("mute");
        }
      };
    }

    if (action === "hide") {
      button.textContent = control?.hidden ? "Remover ocultar" : "Ocultar usuário";

      button.onclick = async () => {
        if (control?.hidden) {
          await unhideUser(targetUid);
          showToast("Usuário não está mais oculto.");
          await updateControlButtons();
        } else {
          openControlModal("hide");
        }
      };
    }

    if (action === "block") {
      button.textContent = control?.blocked ? "Desbloquear usuário" : "Bloquear usuário";

      button.onclick = async () => {
        if (control?.blocked) {
          await unblockUser(targetUid);
          showToast("Usuário desbloqueado.");
          await updateControlButtons();
        } else {
          openControlModal("block");
        }
      };
    }
  });
}

waitForUser(async (user) => {
  if (!user) return;

  await updateControlButtons();
});