function api_obterRelatorioEmpresa(empresaId) {
  if (!empresaId) {
    throw new Error("empresaId obrigatorio");
  }

  var empresa = repo_getById("EMPRESAS", empresaId);
  if (!empresa) {
    throw new Error("Empresa nao encontrada: " + empresaId);
  }

  var projetos = repo_getAll("PROJETOS").filter(function (projeto) {
    return String(projeto.empresaId) === String(empresaId);
  });

  var projetoIds = projetos.map(function (projeto) {
    return projeto.projetoId;
  });

  var tarefas = repo_getAll("TAREFAS").filter(function (tarefa) {
    return projetoIds.indexOf(tarefa.projetoId) !== -1;
  });

  var ctx = { projetos: projetos, tarefas: tarefas };

  var fases = utils_getFasesOficiais().map(function (fase) {
    var projetosDaFase = projetos.filter(function (projeto) {
      return String(projeto.faseAtual) === fase;
    });

    return {
      fase: fase,
      projetos: projetosDaFase
    };
  });

  var tarefasComStatus = tarefas.map(function (tarefa) {
    return {
      tarefa: tarefa,
      status: utils_calcStatusTarefa(tarefa)
    };
  });

  var tarefasAtrasadas = tarefasComStatus.filter(function (item) {
    return item.status === "ATRASADA";
  }).map(function (item) { return item.tarefa; });

  var tarefasVencendo = tarefasComStatus.filter(function (item) {
    return item.status === "VENCENDO_SEMANA";
  }).map(function (item) { return item.tarefa; });

  var progresso = utils_calcProgressoTarefas(tarefas);

  return {
    empresa: empresa,
    status: utils_calcStatusEmpresa(empresaId, ctx),
    projetosPorFase: fases,
    tarefasAtrasadas: tarefasAtrasadas,
    tarefasVencendoSemana: tarefasVencendo,
    progressoPercentual: progresso
  };
}
