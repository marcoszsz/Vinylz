import { AuthService } from '@services/auth.service.js';
import { APP_ROUTES } from '@config/constants.js';

export class Router {
  static currentRoute = null;
  static isAuthenticated = false;
  static currentUser = null;

  static routes = {
    '/': () => this.loadPage('/src/features/misc/pages/index.html'),
    '/login': () => this.loadPage('/src/features/auth/pages/login.html'),
    '/register': () => this.loadPage('/src/features/auth/pages/register.html'),
    '/music-auth': () => this.loadPage('/src/features/auth/pages/musicAuth.html'),
    '/home': () => this.protectedRoute(() => this.loadPage('/src/features/feed/pages/home.html')),
    '/social': () => this.protectedRoute(() => this.loadPage('/src/features/feed/pages/social.html')),
    '/profile': () => this.protectedRoute(() => this.loadPage('/src/features/profile/pages/profile.html')),
    '/profile/:uid': (uid) => this.loadPage(`/src/features/profile/pages/public-profile.html?uid=${uid}`),
    '/messages': () => this.protectedRoute(() => this.loadPage('/src/features/chat/pages/messages.html')),
    '/chat': () => this.protectedRoute(() => this.loadPage('/src/features/chat/pages/chat.html')),
    '/search': () => this.loadPage('/src/features/music-discovery/pages/search.html'),
    '/details/:id': (id) => this.loadPage(`/src/features/music-discovery/pages/details.html?id=${id}`),
    '/collections': () => this.protectedRoute(() => this.loadPage('/src/features/collections/pages/collections.html')),
    '/favorites': () => this.protectedRoute(() => this.loadPage('/src/features/collections/pages/favorites.html')),
    '/notifications': () => this.protectedRoute(() => this.loadPage('/src/features/notifications/pages/notifications.html')),
    '/settings': () => this.protectedRoute(() => this.loadPage('/src/features/settings/pages/settings.html')),
  };

  static init() {
    // Check authentication state
    AuthService.onAuthStateChanged((user) => {
      this.currentUser = user;
      this.isAuthenticated = !!user;

      // Handle initial navigation
      if (!user && !this.isPublicRoute(window.location.pathname)) {
        this.navigateTo('/login');
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      const path = e.state?.path || '/';
      this.navigateTo(path, false);
    });

    // Handle internal navigation via data-link attributes
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        this.navigateTo(href);
      }
    });

    // Initial route
    const initialPath = window.location.pathname;
    if (initialPath !== '/') {
      this.navigateTo(initialPath, false);
    }
  }

  static async loadPage(pagePath) {
    const container = document.getElementById('app') || document.body;

    try {
      const response = await fetch(pagePath);
      if (!response.ok) throw new Error(`Failed to load ${pagePath}`);

      const html = await response.text();
      container.innerHTML = html;

      // Load associated script if exists
      const scriptPath = pagePath.replace('.html', '.js');
      await this.loadScript(scriptPath);
    } catch (error) {
      console.error('Router error:', error);
      container.innerHTML = `<div class="error">Página não encontrada</div>`;
    }
  }

  static async loadScript(scriptPath) {
    try {
      const module = await import(scriptPath);
      if (module.init) {
        module.init();
      }
    } catch (error) {
      console.warn(`No script found for ${scriptPath}`);
    }
  }

  static navigateTo(path, addToHistory = true) {
    const route = Object.keys(this.routes).find((r) => this.matchRoute(r, path));

    if (!route) {
      this.loadPage('/src/features/misc/pages/index.html');
      return;
    }

    const handler = this.routes[route];
    const params = this.extractParams(route, path);

    handler(...params);

    if (addToHistory) {
      history.pushState({ path }, '', path);
    }

    this.currentRoute = path;
  }

  static protectedRoute(handler) {
    if (!this.isAuthenticated) {
      this.navigateTo('/login');
      return;
    }
    handler();
  }

  static isPublicRoute(path) {
    const publicRoutes = ['/', '/login', '/register', '/music-auth'];
    return publicRoutes.some((r) => path.startsWith(r));
  }

  static matchRoute(routePattern, path) {
    const routeParts = routePattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (routeParts.length !== pathParts.length) return false;

    return routeParts.every((part, i) => {
      return part.startsWith(':') || part === pathParts[i];
    });
  }

  static extractParams(routePattern, path) {
    const routeParts = routePattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    return routeParts
      .map((part, i) => (part.startsWith(':') ? pathParts[i] : null))
      .filter((p) => p !== null);
  }
}
