function api_admin_initDemo() {
  return initDemoConsultoriaSheets();
}

function api_admin_healthCheck() {
  var result = {
    ok: true,
    version: "",
    tables: 0,
    timestamp: new Date()
  };

  try {
    repo_getSpreadsheet();
  } catch (err) {
    return { ok: false, error: "sem acesso a planilha", details: String(err) };
  }

  var requiredTables = ["EMPRESAS", "PROJETOS", "TAREFAS", "PARAMETROS", "LOGS"];
  for (var i = 0; i < requiredTables.length; i++) {
    repo_getSheet(requiredTables[i]);
  }
  result.tables = requiredTables.length;
  result.version = repo_getParametro("SYSTEM_VERSION") || "";

  var fases = utils_getFasesOficiais();
  if (!fases || !fases.length) {
    return { ok: false, error: "fases oficiais nao carregadas" };
  }

  api_obterResumoGeral({});

  return result;
}

function api_admin_definirParametro(chave, valor) {
  if (!chave) {
    throw new Error("Chave obrigatoria");
  }

  repo_setParametro(chave, valor);
  repo_log("PARAM", "ADMIN", "", "Parametro atualizado: " + chave);
  return {
    ok: true,
    chave: chave,
    valor: valor
  };
}

function api_admin_normalizeFaseAlias(fase) {
  var base = String(fase || "").trim().toUpperCase();
  if (!base) {
    return "";
  }

  var semAcento = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var alias = {
    PLANEAMENTO: "PLANEJAMENTO",
    DIAGNOSTICO: "DIAGNOSTICO",
    DIAGNOSTICO_INICIAL: "DIAGNOSTICO",
    IMPLANTACAO: "IMPLANTACAO",
    IMPLEMENTACAO: "IMPLANTACAO",
    MONITORACAO: "MONITORAMENTO",
    MONITORAMENTO: "MONITORAMENTO",
    ENCERRAMENTO: "ENCERRAMENTO",
    FECHAMENTO: "ENCERRAMENTO"
  };

  return alias[semAcento] || semAcento;
}

function api_admin_sanearFasesTarefas(options) {
  var opts = options || {};
  var dryRun = opts.dryRun !== false;
  var tarefas = repo_getAll("TAREFAS") || [];
  var fasesOficiais = utils_getFasesOficiais() || [];
  var fasesMap = {};
  fasesOficiais.forEach(function (fase) {
    fasesMap[String(fase)] = true;
  });

  var alteradas = 0;
  var invalidas = 0;
  var mantidas = 0;
  var detalhes = [];

  tarefas.forEach(function (tarefa) {
    if (!tarefa || !tarefa.tarefaId) {
      return;
    }

    var faseOriginal = String(tarefa.fase || "");
    var faseNormalizada = api_admin_normalizeFaseAlias(faseOriginal);

    if (!fasesMap[faseNormalizada]) {
      invalidas += 1;
      detalhes.push({
        tarefaId: tarefa.tarefaId,
        faseOriginal: faseOriginal,
        faseNova: faseNormalizada,
        status: "INVALIDA"
      });
      return;
    }

    var faseAtualNormalizada = String(faseOriginal || "").trim().toUpperCase();
    if (faseAtualNormalizada === faseNormalizada) {
      mantidas += 1;
      return;
    }

    alteradas += 1;
    detalhes.push({
      tarefaId: tarefa.tarefaId,
      faseOriginal: faseOriginal,
      faseNova: faseNormalizada,
      status: dryRun ? "DRY_RUN" : "ATUALIZADA"
    });

    if (!dryRun) {
      repo_update("TAREFAS", tarefa.tarefaId, { fase: faseNormalizada });
      repo_log("DATA_FIX", "TAREFAS", tarefa.tarefaId, "fase: " + faseOriginal + " -> " + faseNormalizada);
    }
  });

  return {
    ok: true,
    dryRun: dryRun,
    total: tarefas.length,
    alteradas: alteradas,
    mantidas: mantidas,
    invalidas: invalidas,
    fasesOficiais: fasesOficiais,
    detalhes: detalhes
  };
}

function api_admin_testarContratoFases() {
  var checks = [];

  function registrar(nome, ok, detalhe) {
    checks.push({
      nome: nome,
      ok: !!ok,
      detalhe: detalhe || ""
    });
  }

  var acoesObrigatorias = [
    "TAREFAS_CRIAR",
    "TAREFAS_ATUALIZAR",
    "PROJETOS_KANBAN",
    "PROJETOS_AVANCAR_FASE"
  ];

  acoesObrigatorias.forEach(function (acao) {
    registrar("acao_registrada_" + acao, !!(ACTIONS && ACTIONS[acao]), "router action");
  });

  var criarInvalido = api_dispatch("TAREFAS_CRIAR", {
    projetoId: "P-CONTRATO",
    fase: "FASE_INVALIDA",
    descricao: "Contrato - fase invalida"
  });
  registrar(
    "TAREFAS_CRIAR_rejeita_fase_invalida",
    criarInvalido && criarInvalido.ok === false && String(criarInvalido.error || "").indexOf("fase invalida") !== -1,
    criarInvalido && criarInvalido.error
  );

  var atualizarInvalido = api_dispatch("TAREFAS_ATUALIZAR", {
    tarefaId: "T-CONTRATO",
    fase: "FASE_INVALIDA"
  });
  registrar(
    "TAREFAS_ATUALIZAR_rejeita_fase_invalida",
    atualizarInvalido && atualizarInvalido.ok === false && String(atualizarInvalido.error || "").indexOf("fase invalida") !== -1,
    atualizarInvalido && atualizarInvalido.error
  );

  var kanbanSemProjeto = api_dispatch("PROJETOS_KANBAN", {});
  registrar(
    "PROJETOS_KANBAN_exige_projetoId",
    kanbanSemProjeto && kanbanSemProjeto.ok === false && String(kanbanSemProjeto.error || "").indexOf("projetoId obrigatorio") !== -1,
    kanbanSemProjeto && kanbanSemProjeto.error
  );

  var avancarSemProjeto = api_dispatch("PROJETOS_AVANCAR_FASE", {});
  registrar(
    "PROJETOS_AVANCAR_FASE_exige_projetoId",
    avancarSemProjeto && avancarSemProjeto.ok === false && String(avancarSemProjeto.error || "").indexOf("projetoId obrigatorio") !== -1,
    avancarSemProjeto && avancarSemProjeto.error
  );

  var falhas = checks.filter(function (item) { return !item.ok; });
  return {
    ok: falhas.length === 0,
    total: checks.length,
    falhas: falhas.length,
    checks: checks
  };
}

function api_admin_homologacaoFase4(options) {
  var opts = options || {};
  var allowMutation = opts.allowMutation === true;
  var empresaFiltro = opts.empresaId ? String(opts.empresaId) : "";
  var fasesOficiais = utils_getFasesOficiais() || [];
  var fasesMap = {};
  fasesOficiais.forEach(function (fase) {
    fasesMap[String(fase)] = true;
  });

  var empresas = repo_getAll("EMPRESAS") || [];
  var projetos = repo_getAll("PROJETOS") || [];
  var tarefas = repo_getAll("TAREFAS") || [];

  if (empresaFiltro) {
    projetos = projetos.filter(function (projeto) {
      return String(projeto.empresaId) === empresaFiltro;
    });
    var projetoIdsFiltro = projetos.map(function (p) { return String(p.projetoId); });
    tarefas = tarefas.filter(function (tarefa) {
      return projetoIdsFiltro.indexOf(String(tarefa.projetoId)) !== -1;
    });
    empresas = empresas.filter(function (empresa) {
      return String(empresa.empresaId) === empresaFiltro;
    });
  }

  var projetosPorEmpresa = {};
  projetos.forEach(function (projeto) {
    var key = String(projeto.empresaId);
    if (!projetosPorEmpresa[key]) {
      projetosPorEmpresa[key] = [];
    }
    projetosPorEmpresa[key].push(projeto);
  });

  // Cenario 1: empresa com 1 projeto e tarefas em todas as fases.
  var cenario1 = { ok: false, empresaId: "", projetoId: "", fasesCobertas: [], faltantes: fasesOficiais.slice() };
  for (var i = 0; i < empresas.length; i++) {
    var empresa = empresas[i];
    var listaProjetos = projetosPorEmpresa[String(empresa.empresaId)] || [];
    if (listaProjetos.length !== 1) {
      continue;
    }
    var projeto = listaProjetos[0];
    var tarefasProjeto = tarefas.filter(function (tarefa) {
      return String(tarefa.projetoId) === String(projeto.projetoId);
    });
    var cobertasMap = {};
    tarefasProjeto.forEach(function (tarefa) {
      var fase = api_admin_normalizeFaseAlias(tarefa.fase);
      if (fasesMap[fase]) {
        cobertasMap[fase] = true;
      }
    });
    var cobertas = Object.keys(cobertasMap);
    var faltantes = fasesOficiais.filter(function (fase) { return !cobertasMap[fase]; });
    cenario1 = {
      ok: faltantes.length === 0,
      empresaId: empresa.empresaId,
      projetoId: projeto.projetoId,
      fasesCobertas: cobertas,
      faltantes: faltantes
    };
    if (cenario1.ok) {
      break;
    }
  }

  // Cenario 2: tarefas antigas (minusculas/espacos/alias).
  var tarefasLegadas = tarefas.filter(function (tarefa) {
    var original = String(tarefa.fase || "");
    var normalizada = api_admin_normalizeFaseAlias(original);
    return original !== String(original).trim().toUpperCase() || normalizada !== String(original).trim().toUpperCase();
  }).map(function (tarefa) {
    return {
      tarefaId: tarefa.tarefaId,
      projetoId: tarefa.projetoId,
      faseOriginal: tarefa.fase,
      faseNormalizada: api_admin_normalizeFaseAlias(tarefa.fase)
    };
  });
  var cenario2 = {
    ok: tarefasLegadas.length > 0,
    totalLegadas: tarefasLegadas.length,
    amostra: tarefasLegadas.slice(0, 20)
  };

  // Cenario 3: concluir MONITORAMENTO -> ENCERRAMENTO.
  var candidata = tarefas.filter(function (tarefa) {
    return api_admin_normalizeFaseAlias(tarefa.fase) === "MONITORAMENTO" && utils_calcStatusTarefa(tarefa) !== "CONCLUIDA";
  })[0];
  var cenario3 = {
    ok: false,
    executado: allowMutation,
    tarefaId: candidata ? candidata.tarefaId : "",
    detalhe: ""
  };
  if (!candidata) {
    cenario3.detalhe = "Sem tarefa candidata em MONITORAMENTO.";
  } else if (!allowMutation) {
    cenario3.detalhe = "Dry-run: concluir com allowMutation=true para validar transicao real.";
  } else {
    api_concluirTarefa(candidata.tarefaId);
    var atualizada = repo_getById("TAREFAS", candidata.tarefaId);
    var faseFinal = api_admin_normalizeFaseAlias(atualizada && atualizada.fase);
    cenario3.ok = faseFinal === "ENCERRAMENTO";
    cenario3.detalhe = "faseFinal=" + faseFinal + " dataConclusao=" + (atualizada && atualizada.dataConclusao);
  }

  // Criterio de saida: sem discrepancia entre listar tarefas e kanban.
  var discrepancias = [];
  projetos.forEach(function (projeto) {
    var lista = api_listarTarefasPorProjeto(projeto.projetoId) || [];
    var listaOficial = lista.filter(function (tarefa) {
      return !!fasesMap[api_admin_normalizeFaseAlias(tarefa.fase)];
    });
    var kanban = api_obterKanbanProjeto(projeto.projetoId) || { fases: [] };
    var kanbanCount = (kanban.fases || []).reduce(function (acc, fase) {
      return acc + ((fase.tarefas || []).length);
    }, 0);
    if (kanbanCount !== listaOficial.length) {
      discrepancias.push({
        projetoId: projeto.projetoId,
        empresaId: projeto.empresaId,
        tarefasListar: listaOficial.length,
        tarefasKanban: kanbanCount
      });
    }
  });

  return {
    ok: discrepancias.length === 0,
    allowMutation: allowMutation,
    empresaFiltro: empresaFiltro,
    cenarios: {
      empresaUmProjetoComTodasFases: cenario1,
      tarefasLegadas: cenario2,
      concluirMonitoramentoParaEncerramento: cenario3
    },
    discrepanciasKanbanVsListar: discrepancias
  };
}
