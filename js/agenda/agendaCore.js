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

let editandoId = null;
let editandoMes = null;

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
      collection(db, "agenda", mesSelecionado, "compromissos"),
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
        parsedTime.minutes,
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
          proximo.datetime.getMinutes(),
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
// =============================
// Listar compromissos ORDENADO
// =============================
async function listTasks() {
  const selectMes = document.getElementById("selectMes");
  const taskList = document.getElementById("taskList");

  if (!selectMes || !taskList) return;

  const mesSelecionado = selectMes.value;
  taskList.innerHTML = "";

  try {
    const snap = await getDocs(
      collection(db, "agenda", mesSelecionado, "compromissos"),
    );

    if (snap.empty) {
      taskList.innerHTML =
        '<li class="list-group-item text-muted">Nenhum compromisso encontrado.</li>';
      return;
    }

    const compromissos = [];

    snap.forEach((docSnap) => {
      const task = docSnap.data();
      const id = docSnap.id;

      const parsedDate = parseDDMMYYYY(task.data);
      const parsedTime = parseTimeString(task.horarioSaida || "");

      if (!parsedDate) return;

      const dt = new Date(
        parsedDate.year,
        parsedDate.month - 1,
        parsedDate.day,
        parsedTime.hours,
        parsedTime.minutes,
      );

      compromissos.push({
        id,
        task,
        datetime: dt,
      });
    });

    // 🔥 Ordena por data mais próxima
    compromissos.sort((a, b) => a.datetime - b.datetime);

    compromissos.forEach(({ id, task }) => {
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
        await updateDoc(doc(db, "agenda", mesSelecionado, "compromissos", id), {
          concluido: checkbox.checked,
        });
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

      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-sm btn-warning";
      btnEdit.innerText = "Editar";

      btnEdit.addEventListener("click", () => {
        editandoId = id;
        editandoMes = mesSelecionado;

        let dataISO = "";
        if (task.data) {
          const [dia, mes, ano] = task.data.split("/");
          dataISO = `${ano}-${mes}-${dia}`;
        }

        document.getElementById("nome").value = task.nome || "";
        document.getElementById("data").value = dataISO;
        document.getElementById("horario").value = task.horarioSaida || "";
        document.getElementById("localSaida").value = task.localSaida || "";
        document.getElementById("destino").value = task.destino || "";

        const modal = new bootstrap.Modal(
          document.getElementById("modalAddTask"),
        );
        modal.show();
      });

      const btnDelete = document.createElement("button");
      btnDelete.className = "btn btn-sm btn-danger ms-2";
      btnDelete.innerText = "Excluir";

      btnDelete.addEventListener("click", async () => {
        if (!confirm("Excluir compromisso?")) return;

        await deleteDoc(doc(db, "agenda", mesSelecionado, "compromissos", id));

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
function getDiaSemana(dateString) {
  const dias = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  const data = new Date(dateString);
  return dias[data.getDay()];
}

async function addTaskForm(event) {
  event.preventDefault();

  const nome = document.getElementById("nome").value;
  const data = document.getElementById("data").value;
  const horarioSaida = document.getElementById("horario").value;
  const localSaida = document.getElementById("localSaida").value;
  const destino = document.getElementById("destino").value;

  if (!nome || !data || !horarioSaida) {
    alert("Preencha os campos obrigatórios!");
    return;
  }

  const [ano, mes, dia] = data.split("-");
  const dataFormatada = `${dia}/${mes}/${ano}`;

  const dataLocal = new Date(Number(ano), Number(mes) - 1, Number(dia));

  const diasSemana = [
    "Domingo","Segunda-feira","Terça-feira",
    "Quarta-feira","Quinta-feira","Sexta-feira","Sábado",
  ];

  const diaSemana = diasSemana[dataLocal.getDay()];

  const nomeMeses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const mesAuto = nomeMeses[Number(mes) - 1] + ano;

  // =========================
  // EDITANDO
  // =========================
  if (editandoId) {

    if (editandoMes !== mesAuto) {

      await deleteDoc(
        doc(db, "agenda", editandoMes, "compromissos", editandoId)
      );

      await addDoc(collection(db, "agenda", mesAuto, "compromissos"), {
        diaSemana,
        nome,
        data: dataFormatada,
        horarioSaida,
        localSaida,
        destino,
        concluido: false,
        notificado: false,
      });

    } else {

      await updateDoc(
        doc(db, "agenda", editandoMes, "compromissos", editandoId),
        {
          diaSemana,
          nome,
          data: dataFormatada,
          horarioSaida,
          localSaida,
          destino,
        }
      );
    }

    editandoId = null;
    editandoMes = null;
    showToast("✏️ Atualizado com sucesso!");
  }

  // =========================
  // NOVO COMPROMISSO
  // =========================
  else {

    await addDoc(collection(db, "agenda", mesAuto, "compromissos"), {
      diaSemana,
      nome,
      data: dataFormatada,
      horarioSaida,
      localSaida,
      destino,
      concluido: false,
      notificado: false,
    });

    showToast("✅ Compromisso adicionado com sucesso!");
  }

  document.getElementById("formAddTask").reset();

  const modal = bootstrap.Modal.getInstance(
    document.getElementById("modalAddTask")
  );
  modal.hide();

  await listTasks();
  await mostrarProximoCompromisso();
}

export { mostrarProximoCompromisso, listTasks };

document.getElementById("formAddTask").addEventListener("submit", addTaskForm);
