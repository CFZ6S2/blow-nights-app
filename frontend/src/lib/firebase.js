import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDxWUweEG-H_fZiYLDlHr6Uz6p4VTsTvtQ",
  authDomain: "gay-meet-app-mvp-26.firebaseapp.com",
  projectId: "gay-meet-app-mvp-26",
  storageBucket: "gay-meet-app-mvp-26.firebasestorage.app",
  messagingSenderId: "410458751631",
  appId: "1:410458751631:web:5104de4d1f227cebe566fa"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
