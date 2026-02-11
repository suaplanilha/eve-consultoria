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
