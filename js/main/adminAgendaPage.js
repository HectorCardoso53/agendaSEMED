// js/main/adminAgendaPage.js
import { auth } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ADMIN_UID } from "../../config/admin.js";
import { inicializarAgenda } from "../agenda/agendaUI.js";


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

  // Inicializa agenda
  inicializarAgenda();

  
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

});
