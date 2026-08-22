import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getMessaging } from "firebase/messaging";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

import { env } from "../env";

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Opcional
};

const app = initializeApp(firebaseConfig);

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  if (process.env.NODE_ENV === 'development') {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  // initializeAppCheck(app, {
  //   provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
  //   isTokenAutoRefreshEnabled: true,
  // });
}

import { getPerformance } from "firebase/performance";

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// getMessaging() throws synchronously in browsers/webviews that lack the
// required APIs (e.g. in-app browsers like WhatsApp/Instagram, some iOS
// contexts). Guard it so an unsupported environment doesn't crash the app.
let messagingInstance = null;
let perfInstance = null;

if (typeof window !== 'undefined') {
  try {
    messagingInstance = getMessaging(app);
  } catch (err) {
    console.warn('Firebase Messaging not supported in this browser:', err?.message);
  }
  
  try {
    perfInstance = getPerformance(app);
  } catch (err) {
    console.warn('Firebase Performance not supported:', err?.message);
  }
}
export const messaging = messagingInstance;
export const perf = perfInstance;

export default app;
