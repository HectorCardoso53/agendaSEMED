import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js";

import { firebaseConfig } from "../config/firebaseConfig.js";
import { ADMIN_UID } from "../config/admin.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

(async function init() {
  // =============================
  // AUTORIZAÇÃO
  // =============================
  onAuthStateChanged(auth, (user) => {
    if (!user || user.uid !== ADMIN_UID) {
      alert("Acesso não autorizado!");
      window.location.href = "index.html";
    }
  });

  // =============================
  // MAPA
  // =============================
  const mapa = L.map("mapa").setView([-1.7633428, -55.8839918], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(mapa);

  // =============================
  // PARAMS
  // =============================
  const params = new URLSearchParams(window.location.search);

  const modoAdicionar = params.get("modoAdicionar") === "true";
  const modoEditarCompromisso = params.get("editarCompromisso") === "true";
  const modoCompromisso = params.get("modoCompromisso") === "true";
  const pontoFocar = params.get("focar");

  const ROOT = "defaultDoc";

  // =============================
  // ICONES
  // =============================
  const iconBase = (url) =>
    L.icon({
      iconUrl: url,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

  const iconeResolvida = iconBase("images/location_green.png"); // visitado
  const iconePendente = iconBase("images/location_red.png");    // a visitar

  // =============================
  // HELPERS
  // =============================
  function safeText(str) {
    return (str || "")
      .toString()
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"');
  }

  // trava para evitar clique duplo criando 2 pontos
  let salvandoClique = false;

  // ==============================================================
  // MODO — ESCOLHER LOCAL PARA O COMPROMISSO (CRIA PONTO + VOLTA)
  // ==============================================================
  if (modoCompromisso) {
    // garantia: se não existir novoCompromisso, não tem como finalizar
    const existeNovo = !!localStorage.getItem("novoCompromisso");
    if (!existeNovo) {
      alert("Não encontrei os dados do compromisso (novoCompromisso). Voltando para a agenda.");
      window.location.href = "home.html";
      return;
    }

    alert("Toque no mapa para escolher o local do compromisso.");

    mapa.on("click", async (e) => {
      if (salvandoClique) return;
      salvandoClique = true;

      try {
        const titulo = prompt("Nome do local:");
        if (!titulo) {
          salvandoClique = false;
          return;
        }

        const demanda = prompt("Descreva a demanda (opcional):") || "";

        const ref = await addDoc(collection(db, "mapa_visitas", ROOT, "itens"), {
          titulo,
          demanda,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          status: "a visitar"
        });

        localStorage.setItem("compromisso_local_id", ref.id);
        localStorage.setItem("compromisso_local_nome", titulo);

        window.location.href = "home.html?finalizarCompromisso=true";
      } catch (err) {
        console.error("Erro ao criar ponto do compromisso:", err);
        alert("Erro ao salvar o local do compromisso. Veja o console.");
        salvandoClique = false;
      }
    });

    // mesmo em modo compromisso, pode mostrar os pontos existentes (opcional)
    carregarPontos().catch(console.error);
    return;
  }

  // ==============================================================
  // MODO — EDITAR LOCALIZAÇÃO DE COMPROMISSO (SEM CRIAR NOVO PONTO)
  // ==============================================================
  if (modoEditarCompromisso) {
    alert("Toque no mapa para escolher o novo local do compromisso.");

    mapa.on("click", async (e) => {
      try {
        const dados = JSON.parse(localStorage.getItem("editCompromisso") || "{}");

        if (!dados.idCompromisso || !dados.localizacaoAntigaId) {
          alert("Erro: dados do compromisso não encontrados.");
          return;
        }

        const titulo = prompt("Nome do local:", dados.localizacaoNome || "");
        if (!titulo) return;

        const demanda = prompt("Descreva a demanda:", dados.demanda || "") || "";

        // 1) atualiza o ponto existente
        await updateDoc(
          doc(db, "mapa_visitas", ROOT, "itens", dados.localizacaoAntigaId),
          {
            titulo,
            demanda,
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }
        );

        // 2) atualiza o compromisso usando o MESMO ponto
        await updateDoc(
          doc(db, "agenda", dados.mesSelecionado, "compromissos", dados.idCompromisso),
          {
            diaSemana: dados.diaSemana,
            nome: dados.nome,
            data: dados.data,
            horarioSaida: dados.horarioSaida,
            localSaida: dados.localSaida,
            destino: dados.destino,
            localizacaoId: dados.localizacaoAntigaId,
            localizacaoNome: titulo
          }
        );

        localStorage.removeItem("editCompromisso");

        alert("Localização atualizada com sucesso!");
        window.location.href = "home.html";
      } catch (err) {
        console.error("Erro ao editar localização do compromisso:", err);
        alert("Erro ao editar localização. Veja o console.");
      }
    });

    await carregarPontos().catch(console.error);
    return;
  }

  // ==============================================================
  // MODO — ADICIONAR LAT/LNG SIMPLES
  // ==============================================================
  if (modoAdicionar) {
    alert("Toque no mapa para selecionar um local.");

    mapa.on("click", (e) => {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);

      localStorage.setItem("localSelecionado", `${lat},${lng}`);
      alert("Local salvo!");
      window.location.href = "home.html";
    });

    await carregarPontos().catch(console.error);
    return;
  }

  // =============================
  // GRÁFICO — DEMANDAS (Resolvidas x Pendentes)
  // =============================
  let grafico = null;

  async function gerarGrafico() {
    const snap = await getDocs(collection(db, "mapa_visitas", ROOT, "itens"));

    let resolvidas = 0;
    let pendentes = 0;

    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.status === "visitado") resolvidas++;
      else pendentes++;
    });

    const ctx = document.getElementById("graficoVisitas");
    if (!ctx) return;

    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Resolvidas", "Pendentes"],
        datasets: [{
          data: [resolvidas, pendentes],
          backgroundColor: ["#198754", "#EA1012"]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }

  document.getElementById("btnGrafico")?.addEventListener("click", () => {
    const card = document.getElementById("cardGrafico");
    if (!card) return;

    const ativo = card.style.display === "block";
    card.style.display = ativo ? "none" : "block";
    if (!ativo) gerarGrafico();
  });

  // =============================
  // CARREGAR PONTOS
  // =============================
  async function carregarPontos() {
    const snap = await getDocs(collection(db, "mapa_visitas", ROOT, "itens"));

    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (!d.lat || !d.lng) return;

      const statusUI = d.status === "visitado" ? "Resolvida" : "Pendente";
      const badgeClass = d.status === "visitado" ? "badge-resolvida" : "badge-pendente";

      const marker = L.marker([d.lat, d.lng], {
        icon: d.status === "visitado" ? iconeResolvida : iconePendente
      }).addTo(mapa);

      const tituloPopup = safeText(d.titulo || "");
      const demanda = safeText(d.demanda || "—");

      marker.bindPopup(`
        <span class="popup-titulo">${tituloPopup}</span>
        <div><strong>📌 Demanda:</strong> ${demanda}</div>
        <div class="badge-status ${badgeClass}">${statusUI}</div>
        <hr style="margin:10px 0" />

        <button onclick="toggleStatus('${docSnap.id}')" class="btn btn-sm btn-primary w-100 mb-1">
          Marcar como ${d.status === "visitado" ? "Pendente" : "Resolvida"}
        </button>

        <button onclick="editarPonto('${docSnap.id}')" class="btn btn-sm btn-warning w-100 mb-1">
          Editar
        </button>

        <button onclick="excluirPonto('${docSnap.id}')" class="btn btn-sm btn-danger w-100 mb-1">
          Excluir
        </button>

        <button onclick="selecionarPonto('${docSnap.id}', '${tituloPopup}')" class="btn btn-sm btn-success w-100 mt-1">
          Usar este local no compromisso
        </button>
      `);

      if (pontoFocar && docSnap.id === pontoFocar) {
        setTimeout(() => {
          mapa.setView([d.lat, d.lng], 18);
          marker.openPopup();
        }, 300);
      }
    });
  }

  // =============================
  // FUNÇÕES GLOBAIS DO POPUP
  // =============================
  window.toggleStatus = async (id) => {
    const ref = doc(db, "mapa_visitas", ROOT, "itens", id);
    const ponto = await getDoc(ref);

    const atual = ponto.data()?.status || "a visitar";
    const novo = atual === "visitado" ? "a visitar" : "visitado";

    await updateDoc(ref, { status: novo });
    recarregarMapa();
  };

  window.editarPonto = async (id) => {
    const ref = doc(db, "mapa_visitas", ROOT, "itens", id);
    const ponto = await getDoc(ref);
    const d = ponto.data() || {};

    const titulo = prompt("Nome do local:", d.titulo || "");
    if (!titulo) return;

    const demanda = prompt("Demanda:", d.demanda || "") || "";

    await updateDoc(ref, { titulo, demanda });
    recarregarMapa();
  };

  window.excluirPonto = async (id) => {
    if (!confirm("Excluir este ponto?")) return;
    await deleteDoc(doc(db, "mapa_visitas", ROOT, "itens", id));
    recarregarMapa();
  };

  window.selecionarPonto = (id, nome) => {
    localStorage.setItem("compromisso_local_id", id);
    localStorage.setItem("compromisso_local_nome", nome);
    alert("Local selecionado! Voltando para a agenda...");
    window.location.href = "home.html?finalizarCompromisso=true";
  };

  // =============================
  // CLICK NO MAPA → ADICIONAR PONTO (MODO NORMAL)
  // =============================
  mapa.on("click", async (e) => {
    try {
      const titulo = prompt("Nome do local:");
      if (!titulo) return;

      const demanda = prompt("Descreva a demanda:") || "";

      await addDoc(collection(db, "mapa_visitas", ROOT, "itens"), {
        titulo,
        demanda,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        status: "a visitar"
      });

      recarregarMapa();
    } catch (err) {
      console.error("Erro ao adicionar ponto:", err);
      alert("Erro ao adicionar ponto. Veja o console.");
    }
  });

  function recarregarMapa() {
    mapa.eachLayer((layer) => {
      if (layer instanceof L.Marker) layer.remove();
    });
    carregarPontos().catch(console.error);
  }

  await carregarPontos().catch(console.error);

})();
