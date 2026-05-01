import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSpkdZnlh4sr5vm0w-QC9poiU4e2uAS2M",
  authDomain: "vinyl-4b187.firebaseapp.com",
  projectId: "vinyl-4b187",
  storageBucket: "vinyl-4b187.firebasestorage.app",
  messagingSenderId: "155456309182",
  appId: "1:155456309182:web:451a778d4110630c421bef",
  measurementId: "G-JHM9MGEZX1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  }
}); 
