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

  var fase = String(payload.fase || "").toUpperCase();
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
  var patch = {
    projetoId: payload.projetoId,
    fase: payload.fase ? String(payload.fase).toUpperCase() : payload.fase,
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

  if (String(projeto.faseAtual || "").toUpperCase() === "PLANEJAMENTO") {
    throw new Error("Projeto em planejamento. Conclusao bloqueada.");
  }

  return repo_update("TAREFAS", tarefaId, {
    dataConclusao: utils_todayISO()
  });
}
