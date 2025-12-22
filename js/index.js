import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "../config/firebaseConfig.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elementos da interface
const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");
const btnLogin = document.getElementById("btnLogin");
const btnText = document.getElementById("btnText");
const loader = document.getElementById("loginLoader");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  // Mostra loader abaixo do botão
  loader.classList.remove("d-none");
  btnLogin.disabled = true;
  btnText.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = "home.html";
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    errorMsg.textContent = "Email ou senha incorretos!";
    errorMsg.classList.remove("d-none");
  } finally {
    // Esconde loader e reativa botão
    loader.classList.add("d-none");
    btnLogin.disabled = false;
    btnText.textContent = "Entrar";
  }
});

// 👁️ Alternar visibilidade da senha
const senhaInput = document.getElementById("senha");
const toggleSenhaBtn = document.getElementById("toggleSenha");

toggleSenhaBtn.addEventListener("click", () => {
  const isPassword = senhaInput.type === "password";
  senhaInput.type = isPassword ? "text" : "password";

  const icon = toggleSenhaBtn.querySelector("i");
  icon.classList.toggle("bi-eye");
  icon.classList.toggle("bi-eye-slash");
});


 //tempo da splash
    setTimeout(() => {
      document.getElementById("content").style.display = "block";
    }, 2400); 
 