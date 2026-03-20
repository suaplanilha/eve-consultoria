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
  return api_jsonSafe(api_listarEmpresas());
}

function api_getEmpresa(id) {
  return api_jsonSafe(api_obterEmpresa(id));
}

function api_createEmpresa(payload) {
  return api_jsonSafe(api_criarEmpresa(payload));
}

function api_updateEmpresa(id, payload) {
  payload = payload || {};
  payload.empresaId = id;
  return api_jsonSafe(api_atualizarEmpresa(id, payload));
}

function api_deleteEmpresa(id) {
  return api_jsonSafe(api_removerEmpresa(id));
}

function api_listProjetos() {
  return api_jsonSafe(api_listarProjetos());
}

function api_listProjetosPorEmpresa(empresaId) {
  return api_jsonSafe(api_listarProjetosPorEmpresa(empresaId));
}

function api_createProjeto(payload) {
  return api_jsonSafe(api_criarProjeto(payload));
}

function api_updateProjeto(id, payload) {
  payload = payload || {};
  payload.projetoId = id;
  return api_jsonSafe(api_atualizarProjeto(id, payload));
}

function api_listTarefasPorProjeto(projetoId) {
  return api_jsonSafe(api_listarTarefasPorProjeto(projetoId));
}

function api_createTarefa(payload) {
  return api_jsonSafe(api_criarTarefa(payload));
}

function api_updateTarefa(id, payload) {
  payload = payload || {};
  payload.tarefaId = id;
  return api_jsonSafe(api_atualizarTarefa(id, payload));
}


function api_getKpisPorEmpresa() {
  return api_jsonSafe(api_obterResumoGeral({}));
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
