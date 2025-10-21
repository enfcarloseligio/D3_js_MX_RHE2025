// scripts/utils/window.indicadoresSIARHE.js
document.addEventListener("DOMContentLoaded", () => {
  d3.csv("data/indicators/indicadores-clave.csv").then(data => {
    const row = data[0];

    // Guardamos los valores en window para uso global
    window.indicadoresSIARHE = {
      enfermeras: parseFloat(row.enfermeras || 0),
      tasa: parseFloat(row.tasa || 0),
      edad: parseFloat(row.edad || 0),
      profesional: parseFloat(row.profesional || 0),
    };

    // Formateador con comas
    const formatear = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    // Insertar valores en elementos con atributo data-indicador
    document.querySelectorAll("[data-indicador]").forEach(el => {
      const key = el.getAttribute("data-indicador");
      const valor = window.indicadoresSIARHE[key];

      if (valor !== undefined) {
        let texto = formatear.format(valor);
        if (key === "profesional") texto += "%";
        el.textContent = texto;
      }
    });
  }).catch(error => {
    console.error("Error al cargar indicadores SIARHE:", error);
  });
});
