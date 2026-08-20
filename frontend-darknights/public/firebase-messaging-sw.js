importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDxWUweEG-H_fZiYLDlHr6Uz6p4VTsTvtQ",
  authDomain: "gay-meet-app-mvp-26.firebaseapp.com",
  projectId: "gay-meet-app-mvp-26",
  storageBucket: "gay-meet-app-mvp-26.firebasestorage.app",
  messagingSenderId: "410458751631",
  appId: "1:410458751631:web:5104de4d1f227cebe566fa"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje en segundo plano recibido ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
