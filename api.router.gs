var ACTIONS = {
  HEALTH: true,
  HEALTHCHECK: true,
  INIT_DEMO: true,
  ADMIN_SANEAR_FASES_TAREFAS: true,
  ADMIN_TESTAR_CONTRATO_FASES: true,
  ADMIN_HOMOLOGACAO_FASE4: true,
  EMPRESAS_LISTAR: true,
  EMPRESAS_OBTER: true,
  EMPRESAS_CRIAR: true,
  EMPRESAS_ATUALIZAR: true,
  EMPRESAS_REMOVER: true,
  PROJETOS_LISTAR: true,
  PROJETOS_LISTAR_EMPRESA: true,
  PROJETOS_OBTER: true,
  PROJETOS_SAUDE: true,
  PROJETOS_CRIAR: true,
  PROJETOS_ATUALIZAR: true,
  PROJETOS_CRIAR_TEMPLATE: true,
  PROJETOS_PLANEJAR: true,
  PROJETOS_KANBAN: true,
  PROJETOS_AVANCAR_FASE: true,
  TAREFAS_LISTAR_POR_PROJETO: true,
  TAREFAS_CRIAR: true,
  TAREFAS_ATUALIZAR: true,
  TAREFAS_DEFINIR_PRAZO: true,
  TAREFAS_CONCLUIR: true,
  KPIS_RESUMO: true,
  DASHBOARD_RESUMO: true,
  DASHBOARD_RESUMO_GERAL: true,
  DASHBOARD_RESUMO_EMPRESA: true,
  DASHBOARD_EMPRESAS_CRITICAS: true,
  DASHBOARD_TOP_RISCO: true,
  RELATORIO_EMPRESA: true,
  TEMPLATES_LISTAR: true,
  TEMPLATES_CHECKLIST: true
};

function api_dispatch(action, payload) {
  Logger.log("[DISPATCH] action=" + action);
  Logger.log("[DISPATCH] payload=" + JSON.stringify(payload || {}));
  if (!ACTIONS[action]) {
    Logger.log("[DISPATCH] ERRO: Action invalida");
    return { ok: false, error: "Action invalida: " + action };
  }
  var data = payload || {};
  try {
    var result = null;
    switch (action) {
      case "HEALTH":
        result = api_admin_healthCheck();
        break;
      case "HEALTHCHECK":
        result = api_admin_healthCheck();
        break;

      case "INIT_DEMO":
        result = api_admin_initDemo();
        break;
      case "ADMIN_SANEAR_FASES_TAREFAS":
        result = api_admin_sanearFasesTarefas(data);
        break;
      case "ADMIN_TESTAR_CONTRATO_FASES":
        result = api_admin_testarContratoFases();
        break;
      case "ADMIN_HOMOLOGACAO_FASE4":
        result = api_admin_homologacaoFase4(data);
        break;

      case "EMPRESAS_LISTAR":
        result = api_listarEmpresas();
        break;
      case "EMPRESAS_OBTER":
        result = api_obterEmpresa(data.empresaId);
        break;
      case "EMPRESAS_CRIAR":
        result = api_criarEmpresa(data);
        break;
      case "EMPRESAS_ATUALIZAR":
        result = api_atualizarEmpresa(data.empresaId, data);
        break;
      case "EMPRESAS_REMOVER":
        result = api_removerEmpresa(data.empresaId);
        break;

      case "PROJETOS_LISTAR":
        result = api_listarProjetos();
        break;
      case "PROJETOS_LISTAR_EMPRESA":
        result = api_listarProjetosPorEmpresa(data.empresaId);
        break;
      case "PROJETOS_OBTER":
        result = api_obterProjeto(data.projetoId);
        break;
      case "PROJETOS_SAUDE":
        result = api_obterSaudeProjeto(data.projetoId);
        break;
      case "PROJETOS_CRIAR":
        result = api_criarProjeto(data);
        break;
      case "PROJETOS_ATUALIZAR":
        result = api_atualizarProjeto(data.projetoId, data);
        break;
      case "PROJETOS_CRIAR_TEMPLATE":
        result = api_criarProjetoComTemplate(data);
        break;
      case "PROJETOS_PLANEJAR":
        result = api_planejarProjeto(data.projetoId, data.tarefasPatch);
        break;
      case "PROJETOS_KANBAN":
        result = api_obterKanbanProjeto(data.projetoId);
        break;
      case "PROJETOS_AVANCAR_FASE":
        result = api_avancarFaseProjeto(data.projetoId);
        break;

      case "TAREFAS_LISTAR_POR_PROJETO":
        result = api_listarTarefasPorProjeto(data.projetoId);
        break;
      case "TAREFAS_CRIAR":
        result = api_criarTarefa(data);
        break;
      case "TAREFAS_ATUALIZAR":
        result = api_atualizarTarefa(data.tarefaId, data);
        break;
      case "TAREFAS_DEFINIR_PRAZO":
        result = api_definirPrazoTarefa(data.tarefaId, data.dataInicio, data.dataFim);
        break;
      case "TAREFAS_CONCLUIR":
        result = api_concluirTarefa(data.tarefaId);
        break;

      case "KPIS_RESUMO":
        result = api_obterResumoGeral(data);
        break;

      case "DASHBOARD_RESUMO":
        result = api_dashboard_resumo();
        break;
      case "DASHBOARD_RESUMO_GERAL":
        result = api_dashboard_resumo_geral();
        break;
      case "DASHBOARD_RESUMO_EMPRESA":
        result = api_dashboard_resumo_empresa(data.empresaId);
        break;
      case "DASHBOARD_TOP_RISCO":
        result = api_dashboard_top_risco();
        break;
      case "DASHBOARD_EMPRESAS_CRITICAS":
        result = api_dashboard_empresasCriticas();
        break;

      case "RELATORIO_EMPRESA":
        result = api_obterRelatorioEmpresa(data.empresaId);
        break;

      case "TEMPLATES_LISTAR":
        result = template_listarModelos();
        break;
      case "TEMPLATES_CHECKLIST":
        result = template_getChecklist(data.modeloId);
        break;
    }
    return api_jsonSafe(result);
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}
