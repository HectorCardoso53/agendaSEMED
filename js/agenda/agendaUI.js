// js/agenda/agendaUI.js

import {
  listTasks,
  addTask,
  mostrarProximoCompromisso,
  finalizarAdicaoCompromisso,
  isFinalizando,
  setFinalizando
} from "./agendaCore.js";

function inicializarAgenda() {
  const btnAddTask = document.getElementById("btnAddTask");
  const selectMes = document.getElementById("selectMes");
  const filtro = document.getElementById("filtroStatus");
  const searchInput = document.getElementById("searchAgenda");

  if (btnAddTask) {
    btnAddTask.addEventListener("click", addTask);
  }

  if (selectMes) {
    selectMes.addEventListener("change", async () => {
      if (!isFinalizando()) {
        await listTasks();
        await mostrarProximoCompromisso();
      }
    });
  }

  if (filtro) {
    filtro.addEventListener("change", listTasks);
  }

  if (searchInput) {
    searchInput.addEventListener("input", listTasks);
  }

  // Seleciona automaticamente o mês atual, se existir no select
  const hoje = new Date();
  const nomeMeses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];
  const mesAtual = nomeMeses[hoje.getMonth()] + hoje.getFullYear();

  if (selectMes) {
    const option = [...selectMes.options].find(opt => opt.value === mesAtual);
    if (option) selectMes.value = mesAtual;
  }

  // carrega lista
  if (!isFinalizando()) {
    listTasks();
    mostrarProximoCompromisso();
  }

}

export { inicializarAgenda };
