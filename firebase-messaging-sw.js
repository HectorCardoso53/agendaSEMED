// firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/9.21.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.21.0/firebase-messaging-compat.js");

// Inicialização do Firebase
firebase.initializeApp({
  apiKey: "AIzaSyA7jUMn4ip8aDy3xxyJysq1wJRGiIrjZIQ",
  authDomain: "agenda-78087.firebaseapp.com",
  projectId: "agenda-78087",
  storageBucket: "agenda-78087.appspot.com",
  messagingSenderId: "929555741792",
  appId: "1:929555741792:web:66bd9aa8ac67cff6f29705"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background:", payload);

  const title = payload.notification?.title || "Notificação";
  const options = {
    body: payload.notification?.body || "Você recebeu uma nova mensagem",
    icon: "/images/icon-192.png",
    badge: "/images/icon-192.png",
    data: { url: payload.fcmOptions?.link || "/" }
  };

  return self.registration.showNotification(title, options);
});

// Clique na notificação
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
