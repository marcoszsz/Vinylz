import { verifyToken, respondUnauthorized, respondServerError } from "../lib/auth-middleware.js";
import { getFirestore } from "../lib/firebase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.setHeader("Content-Type", "application/json");
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { valid, uid } = await verifyToken(req);
  if (!valid) {
    return respondUnauthorized(res);
  }

  const { id } = req.query;
  const targetUid = id || uid;

  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(targetUid).get();

    if (!userDoc.exists) {
      res.setHeader("Content-Type", "application/json");
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const userData = userDoc.data();

    // Remover dados sensíveis se não for o próprio usuário
    if (targetUid !== uid) {
      delete userData.email;
      delete userData.followers; // Ou retornar count apenas
    }

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(userData);
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return respondServerError(res, "Erro ao buscar perfil");
  }
}
