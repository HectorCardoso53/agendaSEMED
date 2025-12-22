// =============================
// grafic.js - Gráfico de documentos com resumo e alternância
// =============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "../config/firebaseConfig.js";
import { ADMIN_UID } from "../config/admin.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =============================
// Verifica se é o admin logado
// =============================
onAuthStateChanged(auth, user => {
  if (!user || user.uid !== ADMIN_UID) {
    alert("Acesso não autorizado!");
    window.location.href = "index.html";
  } else {
    carregarGrafico();
  }
});

// =============================
// Variáveis e elementos DOM
// =============================
const statusEl = document.getElementById("status");
const ctx = document.getElementById("docsChart").getContext("2d");
const btnAlternar = document.getElementById("btnAlternar");

const totalDocsEl = document.getElementById("totalDocs");
const qtdRequerimentosEl = document.getElementById("qtdRequerimentos");
const qtdProjetosEl = document.getElementById("qtdProjetos");
const qtdIndicacoesEl = document.getElementById("qtdIndicacoes");
const qtdOficiosEl = document.getElementById("qtdOficios");

let tipoGrafico = "line";
let chartInstance;

// Categorias do Firestore
const categorias = ["requerimentos", "projetos", "indicacoes", "oficios"];
const nomesCategorias = ["Requerimentos", "Projetos de Lei", "Indicações", "Ofícios"];

// =============================
// Criação do gráfico
// =============================
function desenharGrafico(dados, tipo = "line") {
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: tipo,
    data: {
      labels: nomesCategorias,
      datasets: [
        {
          label: "Quantidade de Documentos",
          data: dados,
          borderColor: "#2f79be",
          backgroundColor: [
            "rgba(47,121,190,0.4)",
            "rgba(40,167,69,0.4)",
            "rgba(255,193,7,0.4)",
            "rgba(23,162,184,0.4)"
          ],
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: "#d30f7e",
          fill: tipo === "line"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      },
      scales: tipo === "pie" ? {} : {
        y: { beginAtZero: true, title: { display: true, text: "Quantidade" } },
        x: { title: { display: true, text: "Categorias" } }
      }
    }
  });
}

// =============================
// Carrega dados do Firestore
// =============================
async function carregarGrafico() {
  try {
    const quantidades = [];
    let total = 0;

    for (const cat of categorias) {
      const snap = await getDocs(collection(db, "documentos", cat, "itens"));
      quantidades.push(snap.size);
      total += snap.size;
    }

    // Atualiza contadores
    totalDocsEl.textContent = total;
    qtdRequerimentosEl.textContent = quantidades[0];
    qtdProjetosEl.textContent = quantidades[1];
    qtdIndicacoesEl.textContent = quantidades[2];
    qtdOficiosEl.textContent = quantidades[3];

    statusEl.textContent = "✅ Dados carregados com sucesso!";
    desenharGrafico(quantidades, tipoGrafico);

    // Alternância de gráfico
    btnAlternar.addEventListener("click", () => {
      tipoGrafico = tipoGrafico === "line" ? "bar" : "line";
      desenharGrafico(quantidades, tipoGrafico);

      btnAlternar.innerHTML = tipoGrafico === "bar"
        ? `<i class="bi bi-graph-up"></i> Mudar para linha`
        : `<i class="bi bi-bar-chart-line"></i> Mudar para barras`;
    });

  } catch (err) {
    console.error("💥 Erro ao carregar gráfico:", err);
    statusEl.textContent = "❌ Erro ao carregar dados!";
  }
}
