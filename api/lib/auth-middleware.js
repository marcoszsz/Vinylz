import { getAuth } from "./firebase-admin.js";

export async function verifyToken(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return { valid: false, error: "Token não fornecido", uid: null };
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return { valid: true, uid: decodedToken.uid, claims: decodedToken };
  } catch (error) {
    console.error("Token verification error:", error.message);
    return { valid: false, error: "Token inválido", uid: null };
  }
}

export function respondUnauthorized(res) {
  res.setHeader("Content-Type", "application/json");
  return res.status(401).json({ error: "Não autorizado" });
}

export function respondForbidden(res) {
  res.setHeader("Content-Type", "application/json");
  return res.status(403).json({ error: "Acesso negado" });
}

export function respondBadRequest(res, message = "Requisição inválida") {
  res.setHeader("Content-Type", "application/json");
  return res.status(400).json({ error: message });
}

export function respondServerError(res, message = "Erro no servidor") {
  res.setHeader("Content-Type", "application/json");
  return res.status(500).json({ error: message });
}
