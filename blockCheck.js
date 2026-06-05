import { apiClient } from "./api-client.js";

export async function isBlockedBetweenUsers(uid1, uid2) {
  if (!uid1 || !uid2) return false;
  if (uid1 === uid2) return false;

  try {
    const result = await apiClient.post("/users/blockCheck", { uid1, uid2 });
    return result.isBlocked;
  } catch (error) {
    console.error("Erro ao verificar bloqueio:", error);
    return false;
  }
}

export async function canInteractWithUser(myUid, targetUid) {
  if (!myUid || !targetUid) {
    alert("Usuário inválido.");
    return false;
  }

  if (myUid === targetUid) {
    alert("Você não pode interagir consigo mesmo.");
    return false;
  }

  const blocked = await isBlockedBetweenUsers(myUid, targetUid);

  if (blocked) {
    alert("Essa interação não está disponível.");
    return false;
  }

  return true;
}