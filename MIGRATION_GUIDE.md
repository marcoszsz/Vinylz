# 📋 Guia de Migração - Como Migrar Seus Endpoints

## Problema: Operações Firebase Diretas no Cliente

**Antes (INSECURO):**
```javascript
// home.js
import { db, auth } from "./firebase.js"; // ⚠️ Config com API Key

export async function loadFeed() {
  const feedRef = collection(db, "posts");
  const q = query(feedRef, where("author", "==", auth.currentUser.uid));
  const snapshot = await getDocs(q);
  // ...
}
```

**Depois (SEGURO):**
```javascript
// home.js
import { apiClient } from "./api-client.js";
import { auth } from "./firebase.js"; // ✅ Apenas Auth, sem API Key

export async function loadFeed() {
  try {
    const feed = await apiClient.get("/posts/feed");
    return feed;
  } catch (error) {
    console.error("Erro ao carregar feed:", error);
    return [];
  }
}
```

## Passo a Passo

### 1. Identifique Operações no Cliente
```bash
# Procure por estes padrões:
grep -r "collection(db" --include="*.js"
grep -r "query(.*where" --include="*.js"
grep -r "getDocs\|setDoc\|addDoc" --include="*.js"
```

### 2. Crie o Endpoint no Backend

**Template: `/api/posts/feed.js`**
```javascript
import { verifyToken, respondUnauthorized, respondServerError } from "../lib/auth-middleware.js";
import { getFirestore } from "../lib/firebase-admin.js";

export default async function handler(req, res) {
  // 1. Verificar método HTTP
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido" });
  }

  // 2. Validar token do usuário
  const { valid, uid } = await verifyToken(req);
  if (!valid) {
    return respondUnauthorized(res);
  }

  try {
    // 3. Executar operação com Firebase Admin
    const db = getFirestore();
    const postsRef = db.collection("posts");
    const query = postsRef.where("author", "==", uid);
    const snapshot = await query.get();

    const posts = [];
    snapshot.forEach(doc => {
      posts.push({ id: doc.id, ...doc.data() });
    });

    // 4. Retornar resposta segura
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({ posts });
  } catch (error) {
    console.error("Erro ao carregar feed:", error);
    return respondServerError(res);
  }
}
```

### 3. Use no Cliente via ApiClient
```javascript
// home.js
import { apiClient } from "./api-client.js";

// GET request
const result = await apiClient.get("/posts/feed");

// POST request
await apiClient.post("/posts/create", { 
  title: "Meu post",
  content: "Conteúdo aqui"
});

// PUT request
await apiClient.put("/posts/123", { 
  title: "Editado" 
});

// DELETE request
await apiClient.delete("/posts/123");
```

## Checklist de Segurança

- [ ] ✅ Endpoint valida token com `verifyToken()`
- [ ] ✅ Endpoint usa Firebase Admin SDK (backend)
- [ ] ✅ Cliente não acessa `db` diretamente (apenas `auth`)
- [ ] ✅ `firebase.js` não expõe API Key
- [ ] ✅ Dados sensíveis filtrados antes de retornar ao cliente
- [ ] ✅ Errors não expõem detalhes internos

## Exemplos Prontos para Copiar

### Endpoint de Criação
```javascript
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { valid, uid } = await verifyToken(req);
  if (!valid) return respondUnauthorized(res);

  const { title, content } = req.body;
  if (!title || !content) {
    return respondBadRequest(res, "Título e conteúdo obrigatórios");
  }

  try {
    const db = getFirestore();
    await db.collection("posts").add({
      title,
      content,
      author: uid,
      createdAt: new Date()
    });

    res.setHeader("Content-Type", "application/json");
    return res.status(201).json({ success: true });
  } catch (error) {
    return respondServerError(res);
  }
}
```

## Limpar Código Antigo

Depois que migrar um arquivo, remova importações não usadas:
```javascript
// ❌ Remove isso se não mais usar
import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "firebase/firestore";

// ✅ Mantenha apenas autenticação se precisar
import { auth } from "./firebase.js";
```

## Testar Localmente

```bash
# Terminal 1: Backend (Vercel Functions)
vercel dev

# Terminal 2: Seu navegador
# Acesse http://localhost:3000 e teste
```

Se receber "Não autorizado", significa:
1. Token não foi enviado
2. Token expirou
3. Usuário não está logado
