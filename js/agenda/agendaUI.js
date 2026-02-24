import {
  listTasks,
  mostrarProximoCompromisso
} from "../agenda/agendaCore.js";

function inicializarAgenda() {
  const selectMes = document.getElementById("selectMes");

  if (selectMes) {
    selectMes.addEventListener("change", async () => {
      await listTasks();
      await mostrarProximoCompromisso();
    });
  }

  // Seleciona mês atual automaticamente
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

  listTasks();
  mostrarProximoCompromisso();
}

export { inicializarAgenda };