function api_obterResumoGeral(filtros) {
  var ctx = utils_buildStatusContext();
  var empresas = repo_getAll("EMPRESAS");
  var projetos = ctx.projetos || [];
  var tarefas = ctx.tarefas || [];
  var params = filtros || {};
  var ctxFiltered = ctx;

  if (params.empresaId) {
    empresas = empresas.filter(function (empresa) {
      return String(empresa.empresaId) === String(params.empresaId);
    });
    projetos = projetos.filter(function (projeto) {
      return String(projeto.empresaId) === String(params.empresaId);
    });
    var projetoIds = projetos.map(function (projeto) {
      return projeto.projetoId;
    });
    tarefas = tarefas.filter(function (tarefa) {
      return projetoIds.indexOf(tarefa.projetoId) !== -1;
    });
  }

  if (params.mes && params.ano) {
    tarefas = tarefas.filter(function (tarefa) {
      if (!utils_normalizeDate(tarefa.dataFim)) {
        return true;
      }
      return api_kpis_dataFimMatch(tarefa.dataFim, params.mes, params.ano);
    });
  }

  var cache = api_kpis_buildStatusCache(empresas, projetos, tarefas, ctxFiltered);

  return {
    empresasTotal: empresas.length,
    empresasEmDia: cache.empresas.EM_DIA || 0,
    empresasEmRisco: cache.empresas.RISCO || 0,
    empresasEmAtraso: cache.empresas.ATRASO || 0,
    empresasConcluidas: cache.empresas.CONCLUIDA || 0,

    projetosTotal: projetos.length,
    projetosPlanejamento: cache.projetos.PLANEJAMENTO || 0,
    projetosEmDia: cache.projetos.EM_DIA || 0,
    projetosEmRisco: cache.projetos.RISCO || 0,
    projetosEmAtraso: cache.projetos.ATRASO || 0,
    projetosConcluidos: cache.projetos.CONCLUIDO || 0,

    tarefasTotal: tarefas.length,
    tarefasConcluidas: cache.tarefas.CONCLUIDA || 0,
    tarefasAtrasadas: cache.tarefas.ATRASADA || 0,
    tarefasParalisadas: cache.tarefas.PARALISADA || 0,
    tarefasVencendoSemana: cache.tarefas.VENCENDO_SEMANA || 0
  };
}

function api_kpis_buildStatusCache(empresas, projetos, tarefas, ctx) {
  var empresaStatus = {};
  var projetoStatus = {};
  var tarefaStatus = {};

  (empresas || []).forEach(function (empresa) {
    var status = utils_calcStatusEmpresa(empresa.empresaId, ctx);
    empresaStatus[status] = (empresaStatus[status] || 0) + 1;
  });

  (projetos || []).forEach(function (projeto) {
    var status = utils_calcStatusProjeto(projeto.projetoId, ctx);
    projetoStatus[status] = (projetoStatus[status] || 0) + 1;
  });

  (tarefas || []).forEach(function (tarefa) {
    var status = utils_calcStatusTarefa(tarefa);
    tarefaStatus[status] = (tarefaStatus[status] || 0) + 1;
  });

  return {
    empresas: empresaStatus,
    projetos: projetoStatus,
    tarefas: tarefaStatus
  };
}

function api_kpis_dataFimMatch(dateInput, mes, ano) {
  var iso = utils_normalizeDate(dateInput);
  if (!iso) {
    return false;
  }
  var parts = iso.split("-");
  return Number(parts[0]) === Number(ano) && Number(parts[1]) === Number(mes);
}

function api_kpis_countEmpresas(empresas, status) {
  var cache = api_kpis_buildStatusCache(empresas, [], []);
  return cache.empresas[status] || 0;
}

function api_kpis_countProjetos(projetos, status) {
  var cache = api_kpis_buildStatusCache([], projetos, []);
  return cache.projetos[status] || 0;
}

function api_kpis_countTarefas(tarefas, status) {
  var cache = api_kpis_buildStatusCache([], [], tarefas);
  return cache.tarefas[status] || 0;
}

function api_kpis_obterResumoGeral() {
  return api_obterResumoGeral({});
}

function api_getKpisGeral(filtro) {
  return api_obterResumoGeral(filtro);
}
