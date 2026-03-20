function api_tarefas_normalizeFase(fase) {
  return String(fase || "").trim().toUpperCase();
}

function api_tarefas_isFaseOficial(fase) {
  var fases = utils_getFasesOficiais() || [];
  return fases.indexOf(api_tarefas_normalizeFase(fase)) !== -1;
}

function api_listarTarefasPorProjeto(projetoId) {
  if (!projetoId) {
    throw new Error("projetoId obrigatorio");
  }
  var tarefas = repo_getAll("TAREFAS");
  return tarefas.filter(function (tarefa) {
    return String(tarefa.projetoId) === String(projetoId);
  }).map(function (tarefa) {
    var enriched = {};
    Object.keys(tarefa).forEach(function (key) {
      enriched[key] = tarefa[key];
    });
    enriched.statusCalc = utils_calcStatusTarefa(enriched);
    enriched.dataInicio = utils_normalizeDate(enriched.dataInicio);
    enriched.dataFim = utils_normalizeDate(enriched.dataFim);
    enriched.dataConclusao = utils_normalizeDate(enriched.dataConclusao);
    return enriched;
  });
}

function api_criarTarefa(payload) {
  var validation = utils_validateTarefa(payload);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" | "));
  }

  var fase = api_tarefas_normalizeFase(payload.fase);
  if (!api_tarefas_isFaseOficial(fase)) {
    throw new Error("fase invalida: " + payload.fase);
  }
  var dataFim = payload.dataFim || "";
  var semana = dataFim ? utils_getSemanaReferencia(dataFim) : (payload.semanaReferencia || "");
  var metaTipo = payload.metaTipo ? String(payload.metaTipo).toUpperCase() : "";

  return repo_insert("TAREFAS", {
    projetoId: payload.projetoId,
    fase: fase,
    descricao: payload.descricao,
    detalhes: payload.detalhes || "",
    resultado: payload.resultado || "",
    observacao: payload.observacao || "",
    metaTipo: metaTipo,
    metaValor: payload.metaValor || "",
    metaUnidade: payload.metaUnidade || "",
    ordem: payload.ordem || "",
    statusManual: "",
    dataInicio: payload.dataInicio || "",
    dataFim: dataFim,
    semanaReferencia: semana,
    dataConclusao: payload.dataConclusao || ""
  });
}

function api_atualizarTarefa(tarefaId, payload) {
  Logger.log("[API] api_atualizarTarefa chamado, tarefaId=" + tarefaId);
  Logger.log("[API] payload=" + JSON.stringify(payload || {}));
  if (!tarefaId) {
    throw new Error("tarefaId obrigatorio");
  }

  var validation = utils_validateTarefaUpdate(payload || {});
  if (!validation.ok) {
    throw new Error(validation.errors.join(" | "));
  }

  var dataFim = payload.dataFim;
  var faseNormalizada = payload.fase !== undefined ? api_tarefas_normalizeFase(payload.fase) : payload.fase;
  if (payload.fase !== undefined && !api_tarefas_isFaseOficial(faseNormalizada)) {
    throw new Error("fase invalida: " + payload.fase);
  }

  var patch = {
    projetoId: payload.projetoId,
    fase: faseNormalizada,
    descricao: payload.descricao,
    detalhes: payload.detalhes,
    resultado: payload.resultado,
    observacao: payload.observacao,
    metaTipo: payload.metaTipo ? String(payload.metaTipo).toUpperCase() : payload.metaTipo,
    metaValor: payload.metaValor,
    metaUnidade: payload.metaUnidade,
    ordem: payload.ordem,
    dataInicio: payload.dataInicio,
    dataFim: dataFim,
    dataConclusao: payload.dataConclusao
  };

  if (dataFim) {
    patch.semanaReferencia = utils_getSemanaReferencia(dataFim);
  }

  Logger.log("[API] Chamando repo_update TAREFAS, patch=" + JSON.stringify(patch));
  return repo_update("TAREFAS", tarefaId, patch);
}

function api_definirPrazoTarefa(tarefaId, dataInicio, dataFim) {
  if (!tarefaId) {
    throw new Error("tarefaId obrigatorio");
  }

  var inicio = utils_normalizeDate(dataInicio);
  var fim = utils_normalizeDate(dataFim);
  if (inicio && fim && fim < inicio) {
    throw new Error("dataFim menor que dataInicio");
  }

  return repo_update("TAREFAS", tarefaId, {
    dataInicio: inicio,
    dataFim: fim,
    semanaReferencia: fim ? utils_getSemanaReferencia(fim) : ""
  });
}

function api_concluirTarefa(tarefaId) {
  if (!tarefaId) {
    throw new Error("tarefaId obrigatorio");
  }

  var tarefa = repo_getById("TAREFAS", tarefaId);
  if (!tarefa) {
    throw new Error("Tarefa nao encontrada: " + tarefaId);
  }

  var projeto = repo_getById("PROJETOS", tarefa.projetoId);
  if (!projeto) {
    throw new Error("Projeto nao encontrado: " + tarefa.projetoId);
  }

  var patch = {
    dataConclusao: utils_todayISO(),
    fase: "ENCERRAMENTO"
  };

  return repo_update("TAREFAS", tarefaId, patch);
}
