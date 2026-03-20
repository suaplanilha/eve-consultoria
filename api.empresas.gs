function api_listarEmpresas() {
  var items = repo_getAll("EMPRESAS");
  return (items || []).map(function (empresa) {
    var normalized = {};
    Object.keys(empresa || {}).forEach(function (key) {
      normalized[key] = empresa[key];
    });
    normalized.status = normalized.status ? String(normalized.status).toUpperCase() : "ATIVA";
    normalized.dataInicio = utils_normalizeDate(empresa.dataInicio);
    normalized.dataFimPrevista = utils_normalizeDate(empresa.dataFimPrevista);
    return normalized;
  });
}

function api_obterEmpresa(empresaId) {
  if (!empresaId) {
    throw new Error("empresaId obrigatorio");
  }
  var empresa = repo_getById("EMPRESAS", empresaId);
  if (!empresa) {
    throw new Error("Empresa nao encontrada: " + empresaId);
  }
  var normalized = {};
  Object.keys(empresa || {}).forEach(function (key) {
    normalized[key] = empresa[key];
  });
  normalized.status = normalized.status ? String(normalized.status).toUpperCase() : "ATIVA";
  normalized.dataInicio = utils_normalizeDate(empresa.dataInicio);
  normalized.dataFimPrevista = utils_normalizeDate(empresa.dataFimPrevista);
  return normalized;
}

function api_criarEmpresa(payload) {
  var validation = utils_validateEmpresa(payload);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" | "));
  }

  return repo_insert("EMPRESAS", {
    nomeRazao: payload.nomeRazao,
    nomeFantasia: payload.nomeFantasia,
    cnpj: payload.cnpj,
    endereco: payload.endereco || "",
    telefone: payload.telefone || "",
    observacao: payload.observacao || "",
    dataInicio: payload.dataInicio || "",
    dataFimPrevista: payload.dataFimPrevista || "",
    status: payload.status ? String(payload.status).toUpperCase() : "ATIVA"
  });
}

function api_atualizarEmpresa(empresaId, payload) {
  if (!empresaId) {
    throw new Error("empresaId obrigatorio");
  }

  var validation = utils_validateEmpresaUpdate(payload || {});
  if (!validation.ok) {
    throw new Error(validation.errors.join(" | "));
  }

  return repo_update("EMPRESAS", empresaId, {
    nomeRazao: payload.nomeRazao,
    nomeFantasia: payload.nomeFantasia,
    cnpj: payload.cnpj,
    endereco: payload.endereco,
    telefone: payload.telefone,
    observacao: payload.observacao,
    dataInicio: payload.dataInicio,
    dataFimPrevista: payload.dataFimPrevista,
    status: payload.status ? String(payload.status).toUpperCase() : payload.status
  });
}

function api_removerEmpresa(empresaId) {
  if (!empresaId) {
    throw new Error("empresaId obrigatorio");
  }

  var projetos = repo_getAll("PROJETOS").filter(function (projeto) {
    return String(projeto.empresaId) === String(empresaId);
  });

  if (projetos.length) {
    return { ok: false, error: "Empresa possui projetos ativos" };
  }

  repo_delete("EMPRESAS", empresaId);
  return { ok: true, empresaId: empresaId };
}
