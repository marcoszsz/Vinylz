import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

/*
  Verifica se um controle expirou.
  Se until for null, significa indeterminado.
*/
function isExpired(until) {
  if (!until) return false;

  const date = until.toDate ? until.toDate() : new Date(until);
  return date.getTime() <= Date.now();
}

/*
  Retorna uma lista de usuários que o usuário atual NÃO quer ver no feed.

  Inclui:
  - silenciados ativos
  - ocultos ativos
  - bloqueados ativos
*/
export async function getIgnoredUsers() {
  const user = auth.currentUser;

  if (!user) return [];

  const controlsRef = collection(db, "users", user.uid, "userControls");
  const snapshot = await getDocs(controlsRef);

  const ignoredUsers = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const targetUid = data.targetUid || docSnap.id;

    const mutedActive = data.muted === true && !isExpired(data.muteUntil);
    const hiddenActive = data.hidden === true && !isExpired(data.hideUntil);
    const blockedActive = data.blocked === true && !isExpired(data.blockUntil);

    if (mutedActive || hiddenActive || blockedActive) {
      ignoredUsers.push(targetUid);
    }
  });

  return [...new Set(ignoredUsers)];
}

/*
  Retorna usuários que bloquearam o usuário atual.

  Isso é importante porque:
  - se alguém te bloqueou, você também não deve ver os posts dessa pessoa
  - você também não deve conseguir interagir com essa pessoa
*/
export async function getUsersWhoBlockedMe() {
  const user = auth.currentUser;

  if (!user) return [];

  const usersRef = collection(db, "users");
  const usersSnapshot = await getDocs(usersRef);

  const blockedMe = [];

  for (const userDoc of usersSnapshot.docs) {
    const otherUid = userDoc.id;

    if (otherUid === user.uid) continue;

    const controlRef = doc(db, "users", otherUid, "userControls", user.uid);
    const controlSnap = await getDoc(controlRef);

    if (!controlSnap.exists()) continue;

    const data = controlSnap.data();

    const blockedActive = data.blocked === true && !isExpired(data.blockUntil);

    if (blockedActive) {
      blockedMe.push(otherUid);
    }
  }

  return blockedMe;
}

/*
  Lista final de usuários que devem sumir do feed.
*/
export async function getBlockedMutedHiddenUsers() {
  const ignoredByMe = await getIgnoredUsers();
  const usersWhoBlockedMe = await getUsersWhoBlockedMe();

  return [...new Set([...ignoredByMe, ...usersWhoBlockedMe])];
}

/*
  Função pronta para filtrar array de posts.

  Ela tenta encontrar o UID do autor em vários nomes comuns:
  - uid
  - userId
  - authorUid
  - ownerUid
*/
export async function filterPostsByUserControls(posts) {
  const ignoredUsers = await getBlockedMutedHiddenUsers();

  return posts.filter((post) => {
    const postAuthorUid =
      post.uid ||
      post.userId ||
      post.authorUid ||
      post.ownerUid;

    if (!postAuthorUid) return true;

    return !ignoredUsers.includes(postAuthorUid);
  });
}