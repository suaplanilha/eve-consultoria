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
