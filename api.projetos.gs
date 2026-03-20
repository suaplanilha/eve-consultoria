function api_normalizeFaseValue(fase) {
  return String(fase || "").trim().toUpperCase();
}

function api_listarProjetos() {
  return repo_getAll("PROJETOS");
}

function api_obterProjeto(projetoId) {
  if (!projetoId) {
    throw new Error("projetoId obrigatorio");
  }
  var projeto = repo_getById("PROJETOS", projetoId);
  if (!projeto) {
    throw new Error("Projeto nao encontrado: " + projetoId);
  }
  projeto.statusCalc = utils_calcStatusProjeto(projetoId);
  return projeto;
}

function api_obterSaudeProjeto(projetoId) {
  return ProjetoHealthService.calcular(projetoId);
}

function api_listarProjetosPorEmpresa(empresaId) {
  if (!empresaId) {
    throw new Error("empresaId obrigatorio");
  }
  var projetos = repo_getAll("PROJETOS");
  return projetos.filter(function (projeto) {
    return String(projeto.empresaId) === String(empresaId);
  });
}

function api_criarProjeto(payload) {
  var validation = utils_validateProjeto(payload);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" | "));
  }

  return repo_insert("PROJETOS", {
    empresaId: payload.empresaId,
    nomeProjeto: payload.nomeProjeto,
    faseAtual: "PLANEJAMENTO",
    dataInicio: payload.dataInicio,
    prazoFinal: payload.prazoFinal
  });
}

function api_atualizarProjeto(projetoId, payload) {
  if (!projetoId) {
    throw new Error("projetoId obrigatorio");
  }

  var validation = utils_validateProjetoUpdate(payload || {});
  if (!validation.ok) {
    throw new Error(validation.errors.join(" | "));
  }

  return repo_update("PROJETOS", projetoId, {
    empresaId: payload.empresaId,
    nomeProjeto: payload.nomeProjeto,
    faseAtual: payload.faseAtual,
    dataInicio: payload.dataInicio,
    prazoFinal: payload.prazoFinal
  });
}

function api_criarProjetoComTemplate(payload) {
  var validation = utils_validateProjeto(payload);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" | "));
  }

  var modeloId = payload.modeloId || payload.templateId || "CONSULTORIA_PADRAO";
  var checklist = template_getChecklist(modeloId);

  var projeto = repo_insert("PROJETOS", {
    empresaId: payload.empresaId,
    nomeProjeto: payload.nomeProjeto,
    faseAtual: "PLANEJAMENTO",
    dataInicio: payload.dataInicio,
    prazoFinal: payload.prazoFinal
  });

  var tarefas = checklist.map(function (item) {
    return {
      projetoId: projeto.projetoId,
      fase: item.fase,
      descricao: item.descricao,
      ordem: item.ordem,
      statusManual: "",
      dataInicio: "",
      dataFim: "",
      semanaReferencia: "",
      statusCalc: "PENDENTE_SEM_DATA",
      dataConclusao: ""
    };
  });

  repo_insertRows("TAREFAS", tarefas);
  repo_log("CREATE_TEMPLATE", "PROJETOS", projeto.projetoId, "modelo=" + payload.modeloId);
  return projeto;
}

function api_planejarProjeto(projetoId, tarefasPatch) {
  if (!projetoId) {
    throw new Error("projetoId obrigatorio");
  }

  var patches = tarefasPatch || [];
  if (!patches.length) {
    throw new Error("tarefasPatch obrigatorio");
  }

  var tarefas = repo_getAll("TAREFAS").filter(function (tarefa) {
    return String(tarefa.projetoId) === String(projetoId);
  });

  patches.forEach(function (patch) {
    var tarefaId = patch.tarefaId;
    if (!tarefaId) {
      throw new Error("tarefaId obrigatorio no patch");
    }

    var tarefa = tarefas.filter(function (item) {
      return String(item.tarefaId) === String(tarefaId);
    })[0];
    if (!tarefa) {
      throw new Error("Tarefa nao pertence ao projeto: " + tarefaId);
    }

    var inicio = utils_normalizeDate(patch.dataInicio);
    var fim = utils_normalizeDate(patch.dataFim);
    if (inicio && fim && fim < inicio) {
      throw new Error("dataFim menor que dataInicio para tarefa: " + tarefaId);
    }

    repo_update("TAREFAS", tarefaId, {
      dataInicio: inicio,
      dataFim: fim,
      semanaReferencia: fim ? utils_getSemanaReferencia(fim) : "",
      ordem: patch.ordem
    });
  });

  return repo_update("PROJETOS", projetoId, { faseAtual: "DIAGNOSTICO" });
}

function api_avancarFaseProjeto(projetoId) {
  if (!projetoId) {
    throw new Error("projetoId obrigatorio");
  }

  var projeto = repo_getById("PROJETOS", projetoId);
  if (!projeto) {
    throw new Error("Projeto nao encontrado: " + projetoId);
  }

  var planejamento = utils_validarProjetoPlanejado(projetoId);
  if (!planejamento.ok) {
    throw new Error("Projeto ainda nao planejado");
  }

  var fases = utils_getFasesOficiais();
  var faseAtual = api_normalizeFaseValue(projeto.faseAtual || "PLANEJAMENTO");
  var indiceAtual = fases.indexOf(faseAtual);

  if (indiceAtual === -1) {
    throw new Error("faseAtual invalida: " + projeto.faseAtual);
  }

  if (indiceAtual === fases.length - 1) {
    throw new Error("Projeto ja esta na fase final");
  }

  var tarefas = repo_getAll("TAREFAS").filter(function (tarefa) {
    return String(tarefa.projetoId) === String(projetoId) && api_normalizeFaseValue(tarefa.fase) === faseAtual;
  });

  var pendentes = tarefas.filter(function (tarefa) {
    return utils_calcStatusTarefa(tarefa) !== "CONCLUIDA";
  });

  if (pendentes.length) {
    throw new Error("Fase atual possui tarefas pendentes: " + pendentes.length);
  }

  var proximaFase = fases[indiceAtual + 1];
  repo_update("PROJETOS", projetoId, { faseAtual: proximaFase });
  return { ok: true, faseAtual: proximaFase };
}

function api_obterKanbanProjeto(projetoId) {
  if (!projetoId) {
    throw new Error("projetoId obrigatorio");
  }

  var fasesOficiais = utils_getFasesOficiais();
  var fasesOficiaisMap = {};
  (fasesOficiais || []).forEach(function (fase) {
    fasesOficiaisMap[String(fase)] = true;
  });

  var tarefas = repo_getAll("TAREFAS").filter(function (tarefa) {
    return String(tarefa.projetoId) === String(projetoId);
  });

  var contagemFaseOriginal = {};
  var contagemFaseNormalizada = {};
  var descartadasFaseInvalida = 0;

  tarefas.forEach(function (tarefa) {
    var faseOriginal = String(tarefa && tarefa.fase || "").trim();
    var faseOriginalKey = faseOriginal || "(VAZIA)";
    contagemFaseOriginal[faseOriginalKey] = (contagemFaseOriginal[faseOriginalKey] || 0) + 1;

    var faseNormalizada = api_normalizeFaseValue(tarefa && tarefa.fase);
    var faseNormKey = faseNormalizada || "(VAZIA)";
    contagemFaseNormalizada[faseNormKey] = (contagemFaseNormalizada[faseNormKey] || 0) + 1;

    if (!fasesOficiaisMap[faseNormalizada]) {
      descartadasFaseInvalida += 1;
    }
  });

  Logger.log(
    "[KANBAN] projetoId=%s total=%s faseOriginal=%s faseNormalizada=%s descartadasFaseInvalida=%s",
    projetoId,
    tarefas.length,
    JSON.stringify(contagemFaseOriginal),
    JSON.stringify(contagemFaseNormalizada),
    descartadasFaseInvalida
  );

  var fases = fasesOficiais.map(function (fase) {
    var tasks = tarefas.filter(function (tarefa) {
      return api_normalizeFaseValue(tarefa.fase) === fase;
    });

    tasks = tasks.map(function (tarefa) {
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

    tasks.sort(function (a, b) {
      var ordemA = Number(a.ordem) || 0;
      var ordemB = Number(b.ordem) || 0;
      return ordemA - ordemB;
    });

    return {
      nome: fase,
      tarefas: tasks
    };
  });

  return { fases: fases };
}
