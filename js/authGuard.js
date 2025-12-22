import { auth, messaging } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { ADMIN_UID } from "../config/admin.js";

// =============================
// Controle de acesso
// =============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  if (user.uid !== ADMIN_UID) {
    alert("Acesso restrito! Você não tem permissão para usar esta página.");
    window.location.href = "index.html";
    return;
  }

  // Se chegou aqui, é ADMIN → carrega script principal (agenda, plano, etc)
  import("./script_old.js");

  // Logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await signOut(auth);
        alert("Você saiu com sucesso!");
        window.location.href = "index.html";
      } catch (err) {
        console.error("Erro ao sair:", err);
        alert("Não foi possível sair. Tente novamente.");
      }
    });
  }

  // Iniciar notificações FCM depois que o usuário está autenticado
  iniciarNotificacoesFCM();
});

// =============================
// Firebase Cloud Messaging — FCM
// =============================
async function iniciarNotificacoesFCM() {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    console.warn("Navegador não suporta SW ou Notification.");
    return;
  }

  try {
    // Registra Service Worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("Service Worker FCM registrado:", registration);

    // Pede permissão para notificações
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Permissão de notificações concedida!");

      // Pega token do dispositivo
      const currentToken = await getToken(messaging, {
        vapidKey: "BNVMQwbksmFRpJ2-KAGd_tDH-FA2N9JB7q272Md5I2Se4LHVMjrJe84svdo1pBYBcDrpqVQUjLeTwyxQB1SM3Nw",
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log("Token FCM:", currentToken);
        // aqui você pode salvar no Firestore se quiser
      } else {
        console.warn("Não foi possível obter o token FCM");
      }
    } else {
      console.warn("Permissão de notificações NEGADA");
    }

    // Mensagens quando o app está aberto (foreground)
    onMessage(messaging, (payload) => {
      console.log("📩 Mensagem recebida em foreground:", payload);
      alert(`${payload.notification?.title}\n${payload.notification?.body}`);
    });

  } catch (err) {
    console.error("Erro ao registrar Service Worker ou obter token:", err);
  }
}
