# 🔒 Proteção de APIs - Migração

## O que foi feito

### 1. **Middleware de Autenticação** (`/api/lib/auth-middleware.js`)
- Valida tokens JWT do Firebase
- Fornece funções auxiliares para respostas padronizadas

### 2. **Firebase Admin SDK** (`/api/lib/firebase-admin.js`)
- Inicializa Firebase Admin apenas no backend
- Provides secure access to Firestore, Auth, Storage

### 3. **Endpoints Protegidos**
```
POST /api/auth/verify          → Verifica se token é válido
POST /api/users/blockCheck     → Verifica bloqueios entre usuários
```

### 4. **Client API** (`api-client.js`)
- Classe reutilizável para fazer requisições autenticadas
- Injeta token Firebase automaticamente
- Tratamento de erros centralizado

### 5. **Remover Secrets do Cliente**
- ✅ `blockCheck.js` - Migrado para usar API backend
- ✅ `firebase.js` - Removida API Key (apenas projectId e authDomain)
- ⏳ Próximas migrações: `home.js`, `chat.js`, `notifications-*`

## Como Usar

### Backend (Node.js)
```javascript
import { apiClient } from "./api-client.js";

// Verifica bloqueio
const result = await apiClient.post("/users/blockCheck", { 
  uid1: "user1",
  uid2: "user2" 
});
```

### Fluxo de Autenticação
1. Cliente faz login com Firebase Auth
2. Obtém token JWT via `getIdToken()`
3. Envia token no header: `Authorization: Bearer <token>`
4. Backend valida token e executa operação

## Variáveis de Ambiente Necessárias

**Vercel (Production)**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_AUTH_DOMAIN`  
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `APP_URL`

**Local (.env.local)**
Gerenciado automaticamente pelo Vercel CLI

## Próximas Prioridades

1. **Endpoints para Posts/Favoritos**
   - `POST /api/posts/create`
   - `POST /api/favorites/toggle`
   - `GET /api/feed`

2. **Endpoints para Perfil**
   - `GET /api/users/:uid/profile`
   - `PUT /api/users/:uid/profile`

3. **Firestore Security Rules**
   - Validar `uid` em requests
   - Permitir leitura apenas de dados públicos

## Segurança

✅ Secrets não expostos no cliente
✅ Token validado em cada request
✅ Operações sensíveis só no backend
✅ CORS e rate limiting (próximo)

❌ Ainda fazer: Implementar rate limiting
