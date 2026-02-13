import {
  db,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "../firebase.js";

import {
  parseDDMMYYYY,
  parseTimeString,
  formatTime,
} from "../core/dateUtils.js";

// =============================
// Toast simples
// =============================
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
    const snap = await getDocs(
      collection(db, "agenda", mesSelecionado, "compromissos")
    );

    const now = new Date();
    const compromissos = [];

    snap.forEach((docSnap) => {
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

      compromissos.push({
        id: docSnap.id,
        nome: data.nome || "(sem nome)",
        destino: data.destino || "",
        datetime: dt,
      });
    });

    const futuros = compromissos
      .filter((c) => c.datetime >= now)
      .sort((a, b) => a.datetime - b.datetime);

    if (!futuros.length) {
      container.innerHTML =
        '<span class="text-muted">Nenhum compromisso restante.</span>';
      return;
    }

    const proximo = futuros[0];

    container.innerHTML = `
      <strong>${proximo.nome}</strong><br>
      <small class="text-muted">
        ⏰ ${formatTime(
          proximo.datetime.getHours(),
          proximo.datetime.getMinutes()
        )}
        — ${proximo.destino || "Local não informado"}
      </small>
    `;
  } catch (err) {
    console.error("Erro ao buscar próximo compromisso:", err);
  }
}

// =============================
// Listar compromissos
// =============================
async function listTasks() {
  const selectMes = document.getElementById("selectMes");
  const taskList = document.getElementById("taskList");

  if (!selectMes || !taskList) return;

  const mesSelecionado = selectMes.value;
  taskList.innerHTML = "";

  try {
    const snap = await getDocs(
      collection(db, "agenda", mesSelecionado, "compromissos")
    );

    if (snap.empty) {
      taskList.innerHTML =
        '<li class="list-group-item text-muted">Nenhum compromisso encontrado.</li>';
      return;
    }

    snap.forEach((docSnap) => {
      const task = docSnap.data();
      const id = docSnap.id;

      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-start mb-2 shadow-sm";

      if (task.concluido) li.style.backgroundColor = "#d4edda";

      const leftDiv = document.createElement("div");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!task.concluido;
      checkbox.className = "form-check-input me-2";

      checkbox.addEventListener("change", async () => {
        await updateDoc(
          doc(db, "agenda", mesSelecionado, "compromissos", id),
          { concluido: checkbox.checked }
        );
        await listTasks();
        await mostrarProximoCompromisso();
      });

      const textDiv = document.createElement("div");
      textDiv.innerHTML = `
        <div>
          <strong>${task.diaSemana || ""}</strong>
          - <strong>${task.nome || ""}</strong>
          - <span style="color:#2f79be; font-weight:700;">
            ${task.horarioSaida || ""}
          </span>
        </div>
        <small class="text-muted">
          📅 ${task.data || ""}
          | 🚏 Saída: ${task.localSaida || ""}
          | 🎯 Destino: ${task.destino || ""}
        </small>
      `;

      leftDiv.appendChild(checkbox);
      leftDiv.appendChild(textDiv);

      const btnRow = document.createElement("div");

      // EDITAR
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-sm btn-warning";
      btnEdit.innerText = "Editar";

      btnEdit.addEventListener("click", async () => {
        const newNome = prompt("Nome:", task.nome) ?? task.nome;
        const newData = prompt("Data (10/12/2026):", task.data) ?? task.data;
        const newHorario =
          prompt("Horário:", task.horarioSaida) ?? task.horarioSaida;

        await updateDoc(
          doc(db, "agenda", mesSelecionado, "compromissos", id),
          {
            nome: newNome,
            data: newData,
            horarioSaida: newHorario,
          }
        );

        await listTasks();
        await mostrarProximoCompromisso();
        showToast("✏️ Atualizado!");
      });

      // EXCLUIR
      const btnDelete = document.createElement("button");
      btnDelete.className = "btn btn-sm btn-danger ms-2";
      btnDelete.innerText = "Excluir";

      btnDelete.addEventListener("click", async () => {
        if (!confirm("Excluir compromisso?")) return;

        await deleteDoc(
          doc(db, "agenda", mesSelecionado, "compromissos", id)
        );

        await listTasks();
        await mostrarProximoCompromisso();
        showToast("🗑️ Excluído!");
      });

      btnRow.appendChild(btnEdit);
      btnRow.appendChild(btnDelete);

      li.appendChild(leftDiv);
      li.appendChild(btnRow);
      taskList.appendChild(li);
    });
  } catch (err) {
    console.error("Erro ao carregar compromissos:", err);
  }
}

// =============================
// Adicionar compromisso
// =============================
async function addTask() {
  const diaSemana = prompt("Dia da Semana:");
  const nome = prompt("Nome do compromisso:");
  const data = prompt("Data (10/12/2026):");
  const horarioSaida = prompt("Horário:");
  const localSaida = prompt("Local de saída:");
  const destino = prompt("Destino:");

  if (!diaSemana || !nome || !data) {
    alert("Preencha os campos obrigatórios!");
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
    concluido: false,
    notificado: false
  });

  await listTasks();
  await mostrarProximoCompromisso();
  showToast("📝 Criado com sucesso!");
}

export {
  mostrarProximoCompromisso,
  listTasks,
  addTask
};
