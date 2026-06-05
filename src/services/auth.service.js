import { auth, db } from '@config/firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const googleProvider = new GoogleAuthProvider();

export class AuthService {
  static getAuthErrorMessage(error) {
    const code = error?.code;
    const messages = {
      'auth/invalid-email': 'E-mail invalido.',
      'auth/user-disabled': 'Essa conta foi desativada.',
      'auth/user-not-found': 'Conta nao encontrada.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/missing-password': 'Digite sua senha.',
      'auth/popup-closed-by-user': 'Login com Google cancelado.',
      'auth/network-request-failed': 'Erro de conexao. Verifique sua internet.',
      'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'A API Key do Firebase esta invalida.',
      'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
      'auth/email-already-in-use': 'Este e-mail ja esta em uso.',
    };
    return messages[code] || 'Erro ao entrar. Tente novamente.';
  }

  static async loginWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: this.getAuthErrorMessage(error) };
    }
  }

  static async registerWithEmail(email, password, displayName) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      await updateProfile(user, { displayName });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName || '',
        createdAt: serverTimestamp(),
        avatar: '',
        bio: '',
        followers: 0,
        following: 0,
      });

      return { success: true, user };
    } catch (error) {
      return { success: false, error: this.getAuthErrorMessage(error) };
    }
  }

  static async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          createdAt: serverTimestamp(),
          avatar: user.photoURL || '',
          bio: '',
          followers: 0,
          following: 0,
        });
      }

      return { success: true, user };
    } catch (error) {
      return { success: false, error: this.getAuthErrorMessage(error) };
    }
  }

  static async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getAuthErrorMessage(error) };
    }
  }

  static async logout() {
    try {
      await auth.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao fazer logout.' };
    }
  }

  static getCurrentUser() {
    return auth.currentUser;
  }

  static onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
}
