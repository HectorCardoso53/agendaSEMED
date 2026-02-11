// js/agenda/agendaCore.js

import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc
} from "../firebase.js";

import {
  parseDDMMYYYY,
  parseTimeString,
  formatTime
} from "../core/dateUtils.js";

// Documento raiz usado pro mapa
const ROOT_DOC = "defaultDoc";

// controla se estamos finalizando um compromisso vindo do mapa
let finalizandoCompromissoAgora = false;

function isFinalizando() {
  return finalizandoCompromissoAgora;
}

function setFinalizando(flag) {
  finalizandoCompromissoAgora = !!flag;
}

// Toast simples (sem notifications.js)
function showToast(msg) {
  console.log("✅", msg);
}

// =============================
// Próximo compromisso
// =============================
async function mostrarProximoCompromisso() {
  const selectMes = document.getElementById("selectMes");
  const container = document.getElementById("compromissoProximoTexto");

  if (!container || !selectMes) return;

  const mesSelecionado = selectMes.value;

  try {
    const snap = await getDocs(collection(db, "agenda", mesSelecionado, "compromissos"));
    const now = new Date();
    const todosCompromissos = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const parsedDate = parseDDMMYYYY(data.data);
      const parsedTime = parseTimeString(data.horarioSaida || "");
      if (!parsedDate) return;

      const dt = new Date(
        parsedDate.year,
        parsedDate.month - 1,
        parsedDate.day,
        parsedTime.hours,
        parsedTime.minutes
      );

      todosCompromissos.push({
        id: docSnap.id,
        nome: data.nome || "(sem nome)",
        destino: data.destino || "",
        datetime: dt,
        concluido: !!data.concluido
      });
    });

    if (!todosCompromissos.length) {
      container.innerHTML = '<span class="text-muted">Nenhum compromisso encontrado.</span>';
      return;
    }

    const futuros = todosCompromissos
      .filter(c => c.datetime >= now)
      .sort((a, b) => a.datetime - b.datetime);

    if (!futuros.length) {
      container.innerHTML = '<span class="text-muted">Nenhum compromisso restante.</span>';
      return;
    }

    const proximo = futuros[0];

    container.innerHTML = `
      <strong>${proximo.nome}</strong><br>
      <small class="text-muted">
        ⏰ ${formatTime(proximo.datetime.getHours(), proximo.datetime.getMinutes())}
        — ${proximo.destino || "Local não informado"}
      </small>
    `;
  } catch (err) {
    console.error("Erro ao buscar próximo compromisso:", err);
    container.textContent = "Erro ao carregar compromisso.";
  }
}

// =============================
// Listar compromissos
// =============================
async function listTasks() {
  const selectMes = document.getElementById("selectMes");
  const taskList = document.getElementById("taskList");
  const filtroStatusSelect = document.getElementById("filtroStatus");
  const searchInput = document.getElementById("searchAgenda");

  if (!selectMes || !taskList || !filtroStatusSelect) return;

  const mesSelecionado = selectMes.value;
  const filtroStatus = filtroStatusSelect.value;
  const termoBusca = (searchInput?.value || "").toLowerCase();

  taskList.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "agenda", mesSelecionado, "compromissos"));

    if (snap.empty) {
      taskList.innerHTML = '<li class="list-group-item text-muted">Nenhum compromisso encontrado.</li>';
      return;
    }

    snap.forEach(docSnap => {
      const task = docSnap.data();
      const id = docSnap.id;

      const textoCompleto = `
        ${task.nome || ""}
        ${task.diaSemana || ""}
        ${task.data || ""}
        ${task.destino || ""}
      `.toLowerCase();

      if (termoBusca && !textoCompleto.includes(termoBusca)) return;
      if (filtroStatus === "pendentes" && task.concluido) return;
      if (filtroStatus === "concluidos" && !task.concluido) return;

      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-start mb-2 shadow-sm";
      if (task.concluido) li.style.backgroundColor = "#d4edda";

      const leftDiv = document.createElement("div");
      leftDiv.className = "d-flex align-items-start";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!task.concluido;
      checkbox.className = "form-check-input me-2";

      checkbox.addEventListener("change", async () => {
        await updateDoc(doc(db, "agenda", mesSelecionado, "compromissos", id), {
          concluido: checkbox.checked
        });
        await listTasks();
        await mostrarProximoCompromisso();
      });

      const textDiv = document.createElement("div");
      textDiv.innerHTML = `
        <div>
          <strong>${task.diaSemana || "Dia não informado"}</strong>
          - <strong>${task.nome || ""}</strong>
          - <span style="color:#2f79be; font-weight:700;">${task.horarioSaida || ""}</span>
        </div>
        <small class="text-muted">
          📅 ${task.data || ""}
          | 🚏 Saída: ${task.localSaida || ""} às ${task.horarioSaida || ""}
          | 🎯 Destino: ${task.destino || ""}
        </small>
      `;

      leftDiv.appendChild(checkbox);
      leftDiv.appendChild(textDiv);

      const btnRow = document.createElement("div");
      btnRow.className = "d-flex gap-1";

      // Botão de localização (mapa)
      if (task.localizacaoId) {
        const btnMapa = document.createElement("button");
        btnMapa.className = "btn btn-sm";
        btnMapa.innerHTML = '<i class="bi bi-geo-alt-fill"></i>';
        btnMapa.title = task.localizacaoNome ? `Local: ${task.localizacaoNome}` : "Ver localização";

        const refPonto = doc(db, "mapa_visitas", ROOT_DOC, "itens", task.localizacaoId);

        getDoc(refPonto).then(snapPonto => {
          if (snapPonto.exists()) {
            const ponto = snapPonto.data();
            if (ponto.status === "a visitar") btnMapa.classList.add("btn-danger");
            else btnMapa.classList.add("btn-success");
          } else {
            btnMapa.classList.add("btn-secondary");
          }
        });

        btnMapa.addEventListener("click", () => {
          window.location.href = `mapa.html?focar=${task.localizacaoId}`;
        });

        btnRow.appendChild(btnMapa);
      }

      // Editar
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-sm btn-warning";
      btnEdit.innerHTML = '<i class="bi bi-pencil-square"></i>';

      btnEdit.addEventListener("click", async () => {
        const newDiaSemana = prompt("Dia da Semana:", task.diaSemana) ?? task.diaSemana;
        const newNome = prompt("Nome:", task.nome) ?? task.nome;
        const newData = prompt("Data (ex: 10/12/2026):", task.data) ?? task.data;
        const newHorario = prompt("Horário:", task.horarioSaida || "") ?? task.horarioSaida;
        const newLocal = prompt("Local de saída:", task.localSaida || "") ?? task.localSaida;
        const newDestino = prompt("Destino:", task.destino || "") ?? task.destino;

        if (!newData) {
          alert("A data é obrigatória.");
          return;
        }

        const trocarLocal = confirm("Deseja alterar a localização no mapa?");
        if (trocarLocal) {
          localStorage.setItem("editCompromisso", JSON.stringify({
            idCompromisso: id,
            mesSelecionado,
            diaSemana: newDiaSemana,
            nome: newNome,
            data: newData,
            horarioSaida: newHorario,
            localSaida: newLocal,
            destino: newDestino,
            localizacaoAntigaId: task.localizacaoId || null
          }));
          window.location.href = `mapa.html?editarCompromisso=true`;
          return;
        }

        const [dia, mes, ano] = newData.split("/");
        const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
        const nomeMes = nomes[parseInt(mes) - 1] + ano;

        if (nomeMes !== mesSelecionado) {
          await addDoc(collection(db, "agenda", nomeMes, "compromissos"), {
            diaSemana: newDiaSemana,
            nome: newNome,
            data: newData,
            horarioSaida: newHorario,
            localSaida: newLocal,
            destino: newDestino,
            concluido: task.concluido || false,
            localizacaoId: task.localizacaoId || null,
            localizacaoNome: task.localizacaoNome || null
          });

          await deleteDoc(doc(db, "agenda", mesSelecionado, "compromissos", id));

          showToast(`📦 Compromisso movido automaticamente para ${nomeMes}!`);
          await listTasks();
          await mostrarProximoCompromisso();
          return;
        }

        await updateDoc(doc(db, "agenda", mesSelecionado, "compromissos", id), {
          diaSemana: newDiaSemana,
          nome: newNome,
          data: newData,
          horarioSaida: newHorario,
          localSaida: newLocal,
          destino: newDestino,
          concluido: task.concluido || false,
          localizacaoId: task.localizacaoId || null,
          localizacaoNome: task.localizacaoNome || null
        });

        await listTasks();
        await mostrarProximoCompromisso();
        showToast("✏️ Compromisso atualizado com sucesso!");
      });

      // Excluir
      const btnDelete = document.createElement("button");
      btnDelete.className = "btn btn-sm btn-danger";
      btnDelete.innerHTML = '<i class="bi bi-trash3-fill"></i>';

      btnDelete.addEventListener("click", async () => {
        if (!confirm("Excluir compromisso?")) return;
        await deleteDoc(doc(db, "agenda", mesSelecionado, "compromissos", id));
        await listTasks();
        await mostrarProximoCompromisso();
        showToast("🗑️ Compromisso excluído!");
      });

      btnRow.appendChild(btnEdit);
      btnRow.appendChild(btnDelete);

      li.appendChild(leftDiv);
      li.appendChild(btnRow);
      taskList.appendChild(li);
    });
  } catch (err) {
    console.error("Erro ao carregar compromissos:", err);
    taskList.innerHTML = '<li class="list-group-item text-danger">Erro ao carregar dados.</li>';
  }
}

// =============================
// Adicionar compromisso
// =============================
async function addTask() {
  const diaSemana = prompt("Dia da Semana:");
  const nome = prompt("Nome do compromisso:");
  const data = prompt("Data (ex: 10/12/2026):");
  const horarioSaida = prompt("Horário:") || "";
  const localSaida = prompt("Local de saída:") || "";
  const destino = prompt("Destino:") || "";

  if (!diaSemana || !nome || !data) {
    alert("Preencha todos os campos obrigatórios!");
    return;
  }

  const [dia, mes, ano] = data.split("/");
  const nomeMeses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const mesAuto = nomeMeses[parseInt(mes) - 1] + ano;

  await addDoc(collection(db, "agenda", mesAuto, "compromissos"), {
    diaSemana,
    nome,
    data,
    horarioSaida,
    localSaida,
    destino,
    concluido: false
  });

  await listTasks();
  await mostrarProximoCompromisso();
  showToast("📝 Compromisso criado com sucesso!");
}


// =============================
// Finalizar adição (voltando do mapa)
// =============================
async function finalizarAdicaoCompromisso() {
  const dados = localStorage.getItem("novoCompromisso");
  if (!dados) {
    alert("Erro ao salvar o compromisso. Inicie novamente.");
    return;
  }

  const info = JSON.parse(dados);
  const localId = localStorage.getItem("compromisso_local_id") || null;
  const localNome = localStorage.getItem("compromisso_local_nome") || null;

  if (!info.data || typeof info.data !== "string" || !info.data.includes("/")) {
    alert("Erro: a data está inválida.");
    return;
  }

  const [dia, mes, ano] = info.data.split("/");
  if (!dia || !mes || !ano || parseInt(mes) < 1 || parseInt(mes) > 12) {
    alert("Erro: data inválida.");
    return;
  }

  const nomesMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const nomeMes = nomesMeses[parseInt(mes) - 1] + ano;

  const compromisso = {
    diaSemana: info.diaSemana || "",
    nome: info.nome || "",
    data: info.data,
    horarioSaida: info.horarioSaida || "",
    localSaida: info.localSaida || "",
    destino: info.destino || "",
    concluido: false,
    localizacaoId: localId,
    localizacaoNome: localNome
  };

  await addDoc(collection(db, "agenda", nomeMes, "compromissos"), compromisso);

  localStorage.removeItem("novoCompromisso");
  localStorage.removeItem("compromisso_local_id");
  localStorage.removeItem("compromisso_local_nome");

  await listTasks();
  await mostrarProximoCompromisso();
  showToast("📍 Compromisso criado com sucesso!");
}

export {
  mostrarProximoCompromisso,
  listTasks,
  addTask,
  finalizarAdicaoCompromisso,
  isFinalizando,
  setFinalizando
};
