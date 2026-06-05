import { Router } from './router.js';
import { AuthService } from '@services/auth.service.js';

class VinylApp {
  static async initialize() {
    console.log('🎵 Initializing Vinyl App...');

    // Initialize router
    Router.init();

    // Setup global error handling
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });

    console.log('✅ Vinyl App initialized');
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => VinylApp.initialize());
} else {
  VinylApp.initialize();
}

export default VinylApp;
