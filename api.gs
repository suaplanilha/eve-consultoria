function api_jsonSafe(value) {
  if (value === undefined) {
    return null;
  }
  return JSON.parse(JSON.stringify(value));
}

function api_health() {
  return api_jsonSafe(api_admin_healthCheck());
}

function api_initDemo() {
  return api_admin_initDemo();
}

function api_listEmpresas() {
  return api_jsonSafe(api_empresas_listar());
}

function api_getEmpresa(id) {
  return api_jsonSafe(api_empresas_obter(id));
}

function api_createEmpresa(payload) {
  return api_jsonSafe(api_empresas_criar(payload));
}

function api_updateEmpresa(id, payload) {
  return api_jsonSafe(api_empresas_atualizar(id, payload));
}

function api_deleteEmpresa(id) {
  return api_jsonSafe(api_empresas_remover(id));
}

function api_listProjetos() {
  return api_jsonSafe(api_projetos_listar());
}

function api_listProjetosPorEmpresa(empresaId) {
  return api_jsonSafe(api_projetos_listarPorEmpresa(empresaId));
}

function api_createProjeto(payload) {
  return api_jsonSafe(api_projetos_criar(payload));
}

function api_updateProjeto(id, payload) {
  return api_jsonSafe(api_projetos_atualizar(id, payload));
}

function api_listTarefasPorProjeto(projetoId) {
  return api_jsonSafe(api_tarefas_listarPorProjeto(projetoId));
}

function api_createTarefa(payload) {
  return api_jsonSafe(api_tarefas_criar(payload));
}

function api_updateTarefa(id, payload) {
  return api_jsonSafe(api_tarefas_atualizar(id, payload));
}


function api_getKpisPorEmpresa() {
  return api_jsonSafe(api_kpis_obterResumoPorEmpresa());
}

function api_listParametros() {
  return api_jsonSafe(repo_readSheet("PARAMETROS"));
}

function api_setParametro(chave, valor) {
  return api_jsonSafe(api_admin_definirParametro(chave, valor));
}

function api_listLogs() {
  return api_jsonSafe(repo_readSheet("LOGS"));
}

function api_setSpreadsheetId(spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error("ID da planilha obrigatorio");
  }
  PropertiesService.getScriptProperties().setProperty("DB_SHEET_ID", spreadsheetId);
  return { ok: true, spreadsheetId: spreadsheetId };
}
