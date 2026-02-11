function api_dashboard_resumo() {
  var empresas = repo_getAll("EMPRESAS");
  var projetos = repo_getAll("PROJETOS");
  var tarefas = repo_getAll("TAREFAS");

  var atrasadas = 0;
  var vencendoSemana = 0;

  (tarefas || []).forEach(function (tarefa) {
    var status = utils_calcStatusTarefa(tarefa);
    if (status === "ATRASADA") {
      atrasadas += 1;
    }
    if (status === "VENCENDO_SEMANA") {
      vencendoSemana += 1;
    }
    if (status === "CONCLUIDA") {
      // counted inside progress helper for planned tasks only
    }
  });

  var progressoGlobal = utils_calcProgressoTarefas(tarefas);

  return {
    totalEmpresas: (empresas || []).length,
    totalProjetos: (projetos || []).length,
    totalTarefas: (tarefas || []).length,
    atrasadas: atrasadas,
    vencendoSemana: vencendoSemana,
    progressoGlobal: progressoGlobal,
    backlogSemData: utils_countBacklogSemData(tarefas)
  };
}

function api_dashboard_resumo_geral() {
  var empresas = repo_getAll("EMPRESAS");
  var ctx = utils_buildStatusContext();
  var projetos = ctx.projetos || [];
  var tarefas = ctx.tarefas || [];

  var tarefasAtrasadas = 0;
  var tarefasVencendoSemana = 0;

  (tarefas || []).forEach(function (tarefa) {
    var status = utils_calcStatusTarefa(tarefa);
    if (status === "ATRASADA") {
      tarefasAtrasadas += 1;
    }
    if (status === "VENCENDO_SEMANA") {
      tarefasVencendoSemana += 1;
    }
  });

  var backlogSemData = utils_countBacklogSemData(tarefas);
  var totalTarefas = (tarefas || []).length;
  var tarefasPlanejadas = totalTarefas - backlogSemData;
  var progressoGlobalPercent = utils_calcProgressoTarefas(tarefas);

  var empresasEmDia = 0;
  var empresasEmRisco = 0;
  var empresasEmAtraso = 0;
  var empresasPausadas = 0;

  (empresas || []).forEach(function (empresa) {
    var statusCalc = utils_calcStatusEmpresa(empresa.empresaId, ctx);
    if (statusCalc === "EM_DIA") {
      empresasEmDia += 1;
    }
    if (statusCalc === "RISCO") {
      empresasEmRisco += 1;
    }
    if (statusCalc === "ATRASO") {
      empresasEmAtraso += 1;
    }
    if (String(empresa.status || "").toUpperCase() === "PAUSADA") {
      empresasPausadas += 1;
    }
  });

  return {
    totalEmpresas: (empresas || []).length,
    totalProjetos: (projetos || []).length,
    totalTarefas: totalTarefas,
    tarefasPlanejadas: tarefasPlanejadas,
    backlogSemData: backlogSemData,
    progressoGlobalPercent: progressoGlobalPercent,
    tarefasAtrasadas: tarefasAtrasadas,
    tarefasVencendoSemana: tarefasVencendoSemana,
    empresasEmDia: empresasEmDia,
    empresasEmRisco: empresasEmRisco,
    empresasEmAtraso: empresasEmAtraso,
    empresasPausadas: empresasPausadas
  };
}

function api_dashboard_resumo_empresa(empresaId) {
  if (!empresaId) {
    throw new Error("empresaId obrigatorio");
  }

  var empresa = repo_getById("EMPRESAS", empresaId);
  if (!empresa) {
    throw new Error("Empresa nao encontrada: " + empresaId);
  }

  var ctx = utils_buildStatusContext();
  var projetos = (ctx.projetos || []).filter(function (projeto) {
    return String(projeto.empresaId) === String(empresaId);
  });
  var projetoIds = projetos.map(function (projeto) {
    return String(projeto.projetoId);
  });
  var tarefas = (ctx.tarefas || []).filter(function (tarefa) {
    return projetoIds.indexOf(String(tarefa.projetoId)) !== -1;
  });

  var atrasadas = 0;
  var vencendoSemana = 0;

  (tarefas || []).forEach(function (tarefa) {
    var status = utils_calcStatusTarefa(tarefa);
    if (status === "ATRASADA") {
      atrasadas += 1;
    }
    if (status === "VENCENDO_SEMANA") {
      vencendoSemana += 1;
    }
  });

  var backlogSemData = utils_countBacklogSemData(tarefas);
  var tarefasPlanejadas = (tarefas || []).length - backlogSemData;
  var progressoPercent = utils_calcProgressoTarefas(tarefas);

  var projetosPorFase = {
    PLANEJAMENTO: 0,
    DIAGNOSTICO: 0,
    IMPLANTACAO: 0,
    MONITORAMENTO: 0,
    ENCERRAMENTO: 0
  };

  projetos.forEach(function (projeto) {
    var fase = String(projeto.faseAtual || "").toUpperCase();
    if (projetosPorFase.hasOwnProperty(fase)) {
      projetosPorFase[fase] += 1;
    }
  });

  return {
    empresa: empresa,
    statusEmpresa: utils_calcStatusEmpresa(empresaId, ctx),
    totalProjetos: projetos.length,
    tarefasPlanejadas: tarefasPlanejadas,
    backlogSemData: backlogSemData,
    progressoPercent: progressoPercent,
    atrasadas: atrasadas,
    vencendoSemana: vencendoSemana,
    projetosPorFase: projetosPorFase
  };
}

function api_dashboard_top_risco() {
  var empresas = repo_getAll("EMPRESAS");
  var ctx = utils_buildStatusContext();
  var projetos = ctx.projetos || [];
  var tarefas = ctx.tarefas || [];

  var empresaNomeMap = {};
  (empresas || []).forEach(function (empresa) {
    empresaNomeMap[String(empresa.empresaId)] = empresa.nomeFantasia || empresa.nomeRazao || "";
  });

  var tarefasPorProjeto = {};
  (tarefas || []).forEach(function (tarefa) {
    var projetoId = String(tarefa.projetoId);
    if (!tarefasPorProjeto[projetoId]) {
      tarefasPorProjeto[projetoId] = [];
    }
    tarefasPorProjeto[projetoId].push(tarefa);
  });

  var ranking = (projetos || []).map(function (projeto) {
    var projetoId = String(projeto.projetoId);
    var lista = tarefasPorProjeto[projetoId] || [];
    var atrasadas = 0;
    var vencendoSemana = 0;
    var backlog = 0;

    lista.forEach(function (tarefa) {
      var status = utils_calcStatusTarefa(tarefa);
      if (status === "ATRASADA") {
        atrasadas += 1;
      }
      if (status === "VENCENDO_SEMANA") {
        vencendoSemana += 1;
      }
      if (!tarefa.dataFim || String(tarefa.dataFim).trim() === "") {
        backlog += 1;
      }
    });

    return {
      projetoId: projeto.projetoId,
      nomeProjeto: projeto.nomeProjeto,
      empresaNome: empresaNomeMap[String(projeto.empresaId)] || "",
      statusCalc: utils_calcStatusProjeto(projeto.projetoId, ctx),
      atrasadas: atrasadas,
      vencendoSemana: vencendoSemana,
      backlog: backlog
    };
  });

  ranking.sort(function (a, b) {
    if (b.atrasadas !== a.atrasadas) {
      return b.atrasadas - a.atrasadas;
    }
    if (b.vencendoSemana !== a.vencendoSemana) {
      return b.vencendoSemana - a.vencendoSemana;
    }
    return b.backlog - a.backlog;
  });

  return ranking.map(function (item) {
    return {
      projetoId: item.projetoId,
      nomeProjeto: item.nomeProjeto,
      empresaNome: item.empresaNome,
      statusCalc: item.statusCalc,
      atrasadas: item.atrasadas,
      vencendoSemana: item.vencendoSemana,
      backlogSemData: item.backlog
    };
  });
}

function api_dashboard_empresasCriticas() {
  var empresas = repo_getAll("EMPRESAS");
  var projetos = repo_getAll("PROJETOS");
  var tarefas = repo_getAll("TAREFAS");

  var projetoEmpresaMap = {};
  (projetos || []).forEach(function (projeto) {
    var empresaId = String(projeto.empresaId);
    if (!projetoEmpresaMap[empresaId]) {
      projetoEmpresaMap[empresaId] = [];
    }
    projetoEmpresaMap[empresaId].push(projeto.projetoId);
  });

  var atrasadasPorProjeto = {};
  (tarefas || []).forEach(function (tarefa) {
    if (utils_calcStatusTarefa(tarefa) === "ATRASADA") {
      atrasadasPorProjeto[String(tarefa.projetoId)] = true;
    }
  });

  var criticas = (empresas || []).filter(function (empresa) {
    var statusEmpresa = String(empresa.status || "").toUpperCase();
    var empresaId = String(empresa.empresaId);
    var projetosEmpresa = projetoEmpresaMap[empresaId] || [];
    var hasAtrasos = projetosEmpresa.some(function (projetoId) {
      return !!atrasadasPorProjeto[String(projetoId)];
    });
    return statusEmpresa !== "ATIVA" || hasAtrasos;
  }).map(function (empresa) {
    var empresaId = String(empresa.empresaId);
    var projetosEmpresa = projetoEmpresaMap[empresaId] || [];
    var atrasadasCount = 0;
    projetosEmpresa.forEach(function (projetoId) {
      if (atrasadasPorProjeto[String(projetoId)]) {
        atrasadasCount += 1;
      }
    });

    return {
      empresaId: empresa.empresaId,
      nomeFantasia: empresa.nomeFantasia,
      nomeRazao: empresa.nomeRazao,
      status: empresa.status,
      atrasadas: atrasadasCount
    };
  });

  return criticas;
}
