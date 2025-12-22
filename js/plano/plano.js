// js/plano/plano.js
import { db, doc, getDoc } from "../firebase.js";

const CHAVE_PIX = "041.346.852-65";

const btnPlano = document.getElementById("btnPlano");
const cardPlano = document.getElementById("cardPlano");
const fecharCard = document.getElementById("fecharCard");
const valorPlanoSpan = document.getElementById("valorPlano");
const valorIndicadorSpan = document.getElementById("valorIndicador");
const diasRestantesSpan = document.getElementById("diasRestantes");
const pixKeyAntecipado = document.getElementById("pixKeyAntecipado");
const btnCopyPixAntecipado = document.getElementById("btnCopyPixAntecipado");

const overlayBloqueio = document.getElementById("overlayBloqueio");
const overlayMsg = document.getElementById("overlayMsg");
const overlayPixKey = document.getElementById("overlayPixKey");
const overlayCopyPix = document.getElementById("overlayCopyPix");

let diasRestantesAtual = 30;

function atualizarCard(usuarioData = {}) {
  if (!usuarioData || typeof usuarioData !== "object") usuarioData = {};

  const planoAtivo = usuarioData.planoAtivo ?? false;
  const precoPadrao = 150;
  const precoIndicacao = 100;
  const valorPlano = planoAtivo ? precoIndicacao : precoPadrao;

  let diasRestantes = 30;
  if (usuarioData.dataInicio && usuarioData.dataInicio.toDate) {
    const inicio = usuarioData.dataInicio.toDate();
    const hoje = new Date();
    const diasPassados = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
    diasRestantes = Math.max(0, 30 - diasPassados);
  }

  diasRestantesAtual = diasRestantes;

  if (valorPlanoSpan) valorPlanoSpan.textContent = `R$ ${valorPlano}`;
  if (valorIndicadorSpan) {
    valorIndicadorSpan.textContent = planoAtivo
      ? "Plano com indicação ✅"
      : "Plano padrão 💳";
  }
  if (diasRestantesSpan) diasRestantesSpan.textContent = `${diasRestantes} dias restantes`;

  const pixBlock = document.getElementById("pixBlock");
  if (pixBlock) pixBlock.style.display = diasRestantes === 0 ? "block" : "none";

  return diasRestantes;
}

async function carregarPlanoUsuario(uid) {
  try {
    const usuarioRef = doc(db, "usuarios", uid);
    const snap = await getDoc(usuarioRef);
    if (snap.exists()) {
      const dados = snap.data();
      atualizarCard(dados);
      verificarBloqueioPorUsuarioData(dados);
    } else {
      atualizarCard();
      verificarBloqueioPorUsuarioData();
    }
  } catch (err) {
    console.error("Erro ao buscar plano:", err);
    atualizarCard();
    verificarBloqueioPorUsuarioData();
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Chave PIX copiada para a área de transferência!");
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    showToast("Chave PIX copiada!");
  }
}

function bloquearAcesso(mensagem = "Seu plano expirou. Renove via PIX para continuar.") {
  if (!overlayBloqueio) return;
  overlayMsg.textContent = mensagem;
  overlayPixKey.value = CHAVE_PIX;
  overlayCopyPix.onclick = () => copyToClipboard(CHAVE_PIX);
  document.body.style.pointerEvents = "none";
  overlayBloqueio.style.display = "flex";
  overlayBloqueio.style.pointerEvents = "auto";
}

function desbloquearAcesso() {
  if (!overlayBloqueio) return;
  overlayBloqueio.style.display = "none";
  document.body.style.pointerEvents = "";
}

function verificarBloqueioPorUsuarioData(usuarioData = {}) {
  let diasRestantes = 30;
  if (usuarioData.dataInicio && usuarioData.dataInicio.toDate) {
    const inicio = usuarioData.dataInicio.toDate();
    const hoje = new Date();
    const diasPassados = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
    diasRestantes = Math.max(0, 30 - diasPassados);
  }

  if (diasRestantes <= 0) bloquearAcesso("Seu plano expirou. Renove via PIX para recuperar o acesso.");
  else desbloquearAcesso();
}

// Eventos de card / PIX antecipado
if (btnPlano) {
  btnPlano.addEventListener("click", async () => {
    if (cardPlano.style.display === "none" || !cardPlano.style.display) {
      cardPlano.style.display = "block";
      // carregar sempre que abrir
      // (auth.currentUser você pode pegar via import se quiser)
    } else {
      cardPlano.style.display = "none";
    }
  });
}

if (fecharCard) {
  fecharCard.addEventListener("click", () => {
    cardPlano.style.display = "none";
  });
}

if (pixKeyAntecipado && btnCopyPixAntecipado) {
  btnCopyPixAntecipado.onclick = () => copyToClipboard(pixKeyAntecipado.value);
}

export { carregarPlanoUsuario, atualizarCard, verificarBloqueioPorUsuarioData };
