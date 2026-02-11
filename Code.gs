function include(filename) {
  // Converte paths com barra (ui/projetos) para underscores (ui_projetos)
  var normalizedName = String(filename || "").replace(/\//g, "_");
  return HtmlService.createHtmlOutputFromFile(normalizedName).getContent();
}

function doGet() {
  var template = HtmlService.createTemplateFromFile("index");
  template.include = include;
  return template.evaluate()
    .setTitle("SAE - Solucao Apollo Eficientes")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
