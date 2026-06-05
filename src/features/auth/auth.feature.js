import { AuthService } from '@services/auth.service.js';

export class AuthFeature {
  static init() {
    this.setupLoginPage();
    this.setupRegisterPage();
    this.setupAuthStateChanges();
  }

  static setupLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email')?.value;
      const password = document.getElementById('passwordInput')?.value;

      if (!email || !password) {
        this.showError('E-mail e senha são obrigatórios');
        return;
      }

      const result = await AuthService.loginWithEmail(email, password);
      if (result.success) {
        window.location.href = '/home';
      } else {
        this.showError(result.error);
      }
    });

    const googleBtn = document.getElementById('googleLogin');
    googleBtn?.addEventListener('click', async () => {
      const result = await AuthService.loginWithGoogle();
      if (result.success) {
        window.location.href = '/home';
      } else {
        this.showError(result.error);
      }
    });
  }

  static setupRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('registerName')?.value;
      const email = document.getElementById('registerEmail')?.value;
      const password = document.getElementById('registerPassword')?.value;

      if (!name || !email || !password) {
        this.showError('Todos os campos são obrigatórios');
        return;
      }

      const result = await AuthService.registerWithEmail(email, password, name);
      if (result.success) {
        window.location.href = '/home';
      } else {
        this.showError(result.error);
      }
    });

    const googleBtn = document.getElementById('googleAuthBtn');
    googleBtn?.addEventListener('click', async () => {
      const result = await AuthService.loginWithGoogle();
      if (result.success) {
        window.location.href = '/home';
      } else {
        this.showError(result.error);
      }
    });
  }

  static setupAuthStateChanges() {
    AuthService.onAuthStateChanged((user) => {
      if (!user && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
        window.location.href = '/login';
      }
    });
  }

  static showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  static showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
    }
  }
}
