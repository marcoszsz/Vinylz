# 🎵 Vinylz - Rede Social Musical

Vinylz é uma rede social focada em música, inspirada em Letterboxd, Spotify e Twitter/X. Usuários podem descobrir músicas, favoritar artistas/álbuns, publicar reviews e interagir com outros fãs.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm ou yarn
- Firebase account
- Spotify Developer account

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Architecture

### Frontend (Modular)
```
src/
├── config/          - Firebase & app configuration
├── services/        - Business logic (Auth, Spotify, API client)
├── features/        - Feature modules (organized by domain)
│   ├── auth/       - Authentication
│   ├── feed/       - Social feed
│   ├── profile/    - User profiles
│   ├── chat/       - Messaging
│   ├── music-discovery/ - Spotify search & details
│   ├── collections/     - Favorites & playlists
│   ├── notifications/   - User notifications
│   └── shared/     - Reusable components & utilities
├── router.js        - SPA routing engine
├── app.js          - Application entry point
└── index.html      - HTML entry point
```

### Backend (Vercel Serverless)
```
api/
├── lib/
│   ├── firebase-admin.js    - Firebase Admin SDK
│   └── auth-middleware.js   - JWT validation
├── auth/           - Authentication endpoints
├── users/          - User management
├── spotify/        - Spotify API integration
├── posts/          - Feed & posts
└── messages/       - Messaging
```

## 🔐 Security

### Authentication
- Firebase Authentication (Email, Google, Spotify OAuth)
- JWT token validation on all API endpoints
- Secure session management

### API Protection
- All sensitive operations protected by JWT
- No secrets exposed in client code
- Firebase Admin SDK for backend operations
- Environment variables for configuration

### Database
- Firebase Firestore with security rules
- User-specific data access controls
- Block/mute user relationships

## 📋 Environment Variables

### Frontend (.env)
```
VITE_FIREBASE_PROJECT_ID=vinyl-4b187
VITE_FIREBASE_AUTH_DOMAIN=vinyl-4b187.firebaseapp.com
```

### Backend (Vercel)
```
FIREBASE_PROJECT_ID=vinyl-4b187
FIREBASE_AUTH_DOMAIN=vinyl-4b187.firebaseapp.com
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
APP_URL=https://vinylz.vercel.app
```

## 🌐 Deployment

### Vercel (Recommended)

The project is configured for automatic deployment to Vercel:

```bash
# Connect to Vercel
vercel link

# Deploy
vercel deploy --prod
```

Configuration is handled by `vercel.json`:
- Vite build: `npm run build`
- Output directory: `dist/`
- SPA routing rewrites all requests to `/index.html`
- API routes proxied to `/api/*`

### First Deployment Checklist

- [ ] Push changes to `main` branch
- [ ] Set environment variables in Vercel dashboard
- [ ] Verify Firebase project ID and auth domain
- [ ] Configure Spotify OAuth redirect URI
- [ ] Test authentication flow
- [ ] Test API endpoints
- [ ] Monitor logs for errors

## 🧪 Testing

```bash
# Development server with hot reload
npm run dev

# Production build test
npm run build
npm run preview
```

## 📚 Documentation

- [Security Architecture](SECURITY_MIGRATION.md)
- [Migration Guide](MIGRATION_GUIDE.md)
- [Refactoring Guide](REFACTORING_COMPLETE.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)

## 🛠️ Tech Stack

### Frontend
- Vanilla JavaScript (ES6+ modules)
- Vite (build tool)
- Firebase SDK
- CSS3 with design system

### Backend
- Node.js (Vercel Serverless)
- Firebase (Auth, Firestore, Storage)
- Spotify Web API

### Deployment
- Vercel (frontend + serverless functions)
- Firebase (database & storage)

## 📞 Support

For issues or questions:
1. Check existing documentation
2. Review migration guides
3. Check Firebase console
4. Review Vercel deployment logs

## 📝 License

MIT License - See LICENSE file

---

**Last Updated:** June 5, 2026
**Status:** Production Ready ✅
