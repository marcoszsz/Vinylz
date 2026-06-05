import { verifyToken, respondUnauthorized, respondBadRequest, respondServerError } from "../lib/auth-middleware.js";
import { getFirestore } from "../lib/firebase-admin.js";

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
  if (!data.blockUntil) return true;
  return !isExpired(data.blockUntil);
}

async function safeGetDoc(db, ref) {
  try {
    return await db.doc(ref).get();
  } catch (error) {
    console.warn("Erro ao ler controle de usuário:", error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.setHeader("Content-Type", "application/json");
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { valid, uid } = await verifyToken(req);
  if (!valid) {
    return respondUnauthorized(res);
  }

  const { uid1, uid2 } = req.body || {};

  if (!uid1 || !uid2) {
    return respondBadRequest(res, "uid1 e uid2 obrigatórios");
  }

  if (uid1 === uid2) {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({ isBlocked: false });
  }

  try {
    const db = getFirestore();

    const [snap1, snap2] = await Promise.all([
      safeGetDoc(db, `users/${uid1}/userControls/${uid2}`),
      safeGetDoc(db, `users/${uid2}/userControls/${uid1}`)
    ]);

    const data1 = snap1?.exists ? snap1.data() : null;
    const data2 = snap2?.exists ? snap2.data() : null;

    const isBlocked = isActiveBlock(data1) || isActiveBlock(data2);

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({ isBlocked });
  } catch (error) {
    console.error("Erro ao verificar bloqueio:", error);
    return respondServerError(res, "Erro ao verificar bloqueio");
  }
}
