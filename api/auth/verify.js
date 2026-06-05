import { verifyToken } from "../lib/auth-middleware.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.setHeader("Content-Type", "application/json");
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { valid, error, uid } = await verifyToken(req);

  if (!valid) {
    res.setHeader("Content-Type", "application/json");
    return res.status(401).json({ error, valid: false });
  }

  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({ valid: true, uid });
}
