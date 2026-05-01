import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* USE A MESMA CONFIG QUE JÁ FUNCIONOU NO SEU auth.js */
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
const auth = getAuth(app);
const db = getFirestore(app);

function addTimeToNow(period) {
  if (period === "forever") return null;

  const now = new Date();

  switch (period) {
    case "1h":
      now.setHours(now.getHours() + 1);
      break;

    case "24h":
      now.setHours(now.getHours() + 24);
      break;

    case "7d":
      now.setDate(now.getDate() + 7);
      break;

    case "30d":
      now.setDate(now.getDate() + 30);
      break;

    default:
      return null;
  }

  return Timestamp.fromDate(now);
}

function isExpired(until) {
  if (!until) return false;

  const date = until.toDate ? until.toDate() : new Date(until);
  return date.getTime() <= Date.now();
}

async function saveUserControl(targetUid, data) {
  const user = auth.currentUser;

  if (!user) {
    alert("Você precisa estar logado.");
    return;
  }

  if (!targetUid) {
    alert("Usuário inválido.");
    return;
  }

  if (user.uid === targetUid) {
    alert("Você não pode aplicar isso em si mesmo.");
    return;
  }

  const ref = doc(db, "users", user.uid, "userControls", targetUid);

  await setDoc(
    ref,
    {
      targetUid,
      ...data,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function muteUser(targetUid, period = "forever") {
  await saveUserControl(targetUid, {
    muted: true,
    muteUntil: addTimeToNow(period),
    createdAt: serverTimestamp()
  });
}

export async function hideUser(targetUid, period = "forever") {
  await saveUserControl(targetUid, {
    hidden: true,
    hideUntil: addTimeToNow(period),
    createdAt: serverTimestamp()
  });
}

export async function blockUser(targetUid, period = "forever") {
  await saveUserControl(targetUid, {
    blocked: true,
    blockUntil: addTimeToNow(period),
    createdAt: serverTimestamp()
  });
}

export async function unmuteUser(targetUid) {
  await saveUserControl(targetUid, {
    muted: false,
    muteUntil: null
  });
}

export async function unhideUser(targetUid) {
  await saveUserControl(targetUid, {
    hidden: false,
    hideUntil: null
  });
}

export async function unblockUser(targetUid) {
  await saveUserControl(targetUid, {
    blocked: false,
    blockUntil: null
  });
}

export async function getUserControl(targetUid) {
  const user = auth.currentUser;

  if (!user || !targetUid) return null;

  const ref = doc(db, "users", user.uid, "userControls", targetUid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();

  const muted = data.muted && !isExpired(data.muteUntil);
  const hidden = data.hidden && !isExpired(data.hideUntil);
  const blocked = data.blocked && !isExpired(data.blockUntil);

  return {
    ...data,
    muted,
    hidden,
    blocked
  };
}

export function waitForUser(callback) {
  onAuthStateChanged(auth, callback);
}