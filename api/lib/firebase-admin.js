import * as admin from "firebase-admin";

let app;

export function initializeAdmin() {
  if (app) return app;

  if (admin.apps.length > 0) {
    app = admin.app();
  } else {
    app = admin.initializeApp();
  }

  return app;
}

export function getFirestore() {
  initializeAdmin();
  return admin.firestore();
}

export function getAuth() {
  initializeAdmin();
  return admin.auth();
}

export function getStorage() {
  initializeAdmin();
  return admin.storage();
}
