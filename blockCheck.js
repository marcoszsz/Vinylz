import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* MESMA CONFIG DO SEU PROJETO */
const firebaseConfig = {
  apiKey: "AIzaSyCSpkdZnlh4sr5vm0w-QC9poiU4e2uAS2M",
  authDomain: "vinyl-4b187.firebaseapp.com",
  projectId: "vinyl-4b187",
  storageBucket: "vinyl-4b187.firebasestorage.app",
  messagingSenderId: "155456309182",
  appId: "1:155456309182:web:451a778d4110630c421bef",
  measurementId: "G-JHM9MGEZX1"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

function isExpired(until) {
  if (!until) return false;

  try {
    const date = until.toDate ? until.toDate() : new Date(until);
    return date.getTime() <= Date.now();
  } catch {
    return false;
  }
}

function isActiveBlock(data) {
  if (!data) return false;

  if (data.blocked !== true) return false;

  // blockUntil vazio = bloqueio indeterminado
  if (!data.blockUntil) return true;

  return !isExpired(data.blockUntil);
}

async function safeGetDoc(ref) {
  try {
    return await getDoc(ref);
  } catch (error) {
    console.warn("Não foi possível ler controle de usuário:", error);
    return null;
  }
}

export async function isBlockedBetweenUsers(uid1, uid2) {
  if (!uid1 || !uid2) return false;
  if (uid1 === uid2) return false;

  const controlRef1 = doc(db, "users", uid1, "userControls", uid2);
  const controlRef2 = doc(db, "users", uid2, "userControls", uid1);

  const [snap1, snap2] = await Promise.all([
    safeGetDoc(controlRef1),
    safeGetDoc(controlRef2)
  ]);

  const data1 = snap1 && snap1.exists() ? snap1.data() : null;
  const data2 = snap2 && snap2.exists() ? snap2.data() : null;

  return isActiveBlock(data1) || isActiveBlock(data2);
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